"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWorkspaceAccess, requireCurrentUser } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";
import { getDefaultAIProviderCredential } from "@/lib/ai";
import { recordAIUsage } from "@/lib/ai/usage";
import { toSafeProviderErrorMessage } from "@/lib/ai/errors";
import { computeAdditionalScopeDelta } from "@/lib/requirements/scope";
import { proposalContentSchema, type ProposalContent } from "@/lib/ai/schemas";
import type { Prisma } from "@/generated/prisma/client";

export type ActionState = { error?: string; message?: string } | undefined;

// The enriched, client-facing shape of a revision preview — requirement
// removals carry real text (not just an id) so the UI never has to guess
// what's being removed, and everything the confirm step needs (including the
// full revised content) round-trips through the client as one opaque blob.
export type ProposalRevisionPreview = {
  isScopeChange: boolean;
  summary: string;
  requirementsToRemove: { id: string; requirement: string }[];
  requirementsToAdd: { category: string; requirement: string; priority: string }[];
  revisedProposal: ProposalContent;
  sourceRequirementVersionId: string;
};

export type RevisionPreviewState = { error?: string; preview?: ProposalRevisionPreview } | undefined;

const EARLY_STATUSES = ["NEW", "CONTACTED"];

// Marks the latest still-open change request (if any) resolved. Independent
// of Proposal.status — a resend in between can reset status back to SENT
// without this ever having been called, so this is the only thing that
// actually clears an open request rather than just hiding its banner.
async function resolveOpenChangeRequest(tx: Prisma.TransactionClient, proposalId: string) {
  const open = await tx.proposalChangeRequest.findFirst({
    where: { proposalId, resolvedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (open) {
    await tx.proposalChangeRequest.update({ where: { id: open.id }, data: { resolvedAt: new Date() } });
  }
}

export async function generateProposalAction(
  projectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const user = await requireCurrentUser();

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    include: { lead: true },
  });
  if (!project) return { error: "Project not found" };

  const existingProposal = await db.proposal.findFirst({
    where: { projectId, kind: "ORIGINAL" },
    include: { shares: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  // Checked against the share, not proposal.status — regenerating always
  // resets proposal.status to DRAFT, so checking that field here would only
  // ever catch the very first regenerate attempt and never fire again.
  if (existingProposal?.shares[0]?.status === "ACCEPTED") {
    return { error: "The client already accepted this proposal — its content is locked." };
  }
  // Once a first version exists, every further change goes through "Revise
  // with AI" instead — it goes through an explicit change preview (and,
  // where relevant, a Requirements diff) rather than silently overwriting
  // whatever's already there, whether that's a still-editable draft, a link
  // the client currently has open, or a rejected version.
  if (existingProposal) {
    return {
      error: "A version of this proposal already exists — use \"Revise with AI\" to update it instead.",
    };
  }

  const latestRequirementVersion = await db.requirementVersion.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });
  if (!latestRequirementVersion) {
    return { error: "Lock approved scope before generating a proposal." };
  }

  const snapshot = latestRequirementVersion.snapshot as unknown as {
    category: string;
    requirement: string;
    confidence: string;
  }[];
  const approvedRequirements = snapshot;

  const credential = await getDefaultAIProviderCredential(workspaceId);
  if (!credential) {
    return { error: "No AI provider is configured. Add one in Settings first." };
  }

  let result;
  try {
    result = await credential.provider.generateProposal(credential.apiKey, credential.model, {
      leadName: project.lead.name,
      company: project.lead.company,
      industry: project.lead.industry,
      expectedTimeline: project.timeline,
      approvedRequirements,
    });
  } catch (error) {
    return { error: toSafeProviderErrorMessage(error) };
  }

  const proposal = await db.$transaction(async (tx) => {
    let proposalRecord = await tx.proposal.findFirst({ where: { projectId, kind: "ORIGINAL" } });
    if (!proposalRecord) {
      proposalRecord = await tx.proposal.create({ data: { projectId, kind: "ORIGINAL", status: "DRAFT" } });
    }

    const lastVersion = await tx.proposalVersion.findFirst({
      where: { proposalId: proposalRecord.id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    await tx.proposalVersion.create({
      data: {
        proposalId: proposalRecord.id,
        version: nextVersion,
        content: result.data,
        requirementVersionId: latestRequirementVersion.id,
        createdById: user.id,
      },
    });

    await tx.proposal.update({
      where: { id: proposalRecord.id },
      data: { currentVersion: nextVersion, status: "DRAFT" },
    });

    // Regenerating incorporates whatever the client asked for into the new
    // version — addresses any request still open, same as a manual edit.
    await resolveOpenChangeRequest(tx, proposalRecord.id);

    await recordAIUsage(tx, {
      workspaceId,
      provider: credential.providerName,
      model: credential.model,
      operation: "GENERATE_PROPOSAL",
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });

    await logActivity(tx, {
      workspaceId,
      leadId: project.leadId,
      projectId,
      type: "proposal.generated",
      description: `Proposal draft generated (v${nextVersion})`,
    });

    if (EARLY_STATUSES.includes(project.lead.status)) {
      await tx.lead.update({ where: { id: project.leadId }, data: { status: "ACTIVE" } });
      await logActivity(tx, {
        workspaceId,
        leadId: project.leadId,
        projectId,
        type: "lead.status_changed",
        description: "Status changed to Active",
      });
    }

    return proposalRecord;
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/proposal`);
  return { message: `Proposal generated (v${proposal.currentVersion})` };
}

// Case 3: the project's ORIGINAL quotation is already accepted, so the
// commercial scope is locked. Any newly-approved requirement not yet
// covered by any existing document becomes a separate Additional proposal —
// never modifies the original. Creates its own delta-only RequirementVersion
// (just the new items) so the resulting document's linked snapshot is
// exactly its own scope, not the full project history.
export async function generateAdditionalProposalAction(
  projectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const user = await requireCurrentUser();

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    include: { lead: true },
  });
  if (!project) return { error: "Project not found" };

  const delta = await computeAdditionalScopeDelta(projectId);
  if (!delta.eligible) {
    return { error: "The original quotation must be accepted before additional scope can be proposed." };
  }
  if (delta.deltaRequirements.length === 0) {
    return { error: "No newly-approved requirements to include — approve at least one new requirement first." };
  }

  // An Additional proposal from an earlier round that hasn't been decided
  // yet (not Accepted/Rejected) absorbs new requirements instead of a
  // competing parallel proposal being created alongside it — same "only one
  // live document per scope round" rule the Original proposal already
  // follows. Once this one is Accepted or Rejected, the next new
  // requirement starts a fresh Additional round.
  const openAdditionalProposal = await db.proposal.findFirst({
    where: { projectId, kind: "ADDITIONAL", status: { notIn: ["ACCEPTED", "REJECTED"] } },
    orderBy: { createdAt: "desc" },
    include: { versions: { orderBy: { version: "desc" }, take: 1, include: { requirementVersion: true } } },
  });
  const priorSnapshot = openAdditionalProposal
    ? ((openAdditionalProposal.versions[0]?.requirementVersion.snapshot ?? []) as unknown as {
        id: string;
        category: string;
        requirement: string;
        status: string;
        priority: string;
        confidence: string;
        evidence: string | null;
        notes: string | null;
      }[])
    : [];
  // Safe to concatenate without de-duping — computeAdditionalScopeDelta's
  // "covered" check already excludes anything in priorSnapshot, since that's
  // exactly what's already in a document (this proposal's own last version).
  const combinedRequirements = [...priorSnapshot, ...delta.deltaRequirements];

  const credential = await getDefaultAIProviderCredential(workspaceId);
  if (!credential) {
    return { error: "No AI provider is configured. Add one in Settings first." };
  }

  let result;
  try {
    result = await credential.provider.generateProposal(credential.apiKey, credential.model, {
      leadName: project.lead.name,
      company: project.lead.company,
      industry: project.lead.industry,
      expectedTimeline: project.timeline,
      approvedRequirements: combinedRequirements,
    });
  } catch (error) {
    return { error: toSafeProviderErrorMessage(error) };
  }

  await db.$transaction(async (tx) => {
    const lastRequirementVersion = await tx.requirementVersion.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const changesSummary = openAdditionalProposal
      ? `Additional scope revised: ${delta.deltaRequirements.length} more requirement${delta.deltaRequirements.length === 1 ? "" : "s"} added to the pending round`
      : `Additional scope: ${delta.deltaRequirements.length} new requirement${delta.deltaRequirements.length === 1 ? "" : "s"}`;
    const combinedRequirementVersion = await tx.requirementVersion.create({
      data: {
        projectId,
        version: (lastRequirementVersion?.version ?? 0) + 1,
        changesSummary,
        snapshot: combinedRequirements,
      },
    });

    const proposalRecord = openAdditionalProposal
      ? openAdditionalProposal
      : await tx.proposal.create({ data: { projectId, kind: "ADDITIONAL", status: "DRAFT" } });
    const nextVersion = (openAdditionalProposal?.versions[0]?.version ?? 0) + 1;

    await tx.proposalVersion.create({
      data: {
        proposalId: proposalRecord.id,
        version: nextVersion,
        content: result.data,
        requirementVersionId: combinedRequirementVersion.id,
        createdById: user.id,
      },
    });

    await tx.proposal.update({
      where: { id: proposalRecord.id },
      data: { currentVersion: nextVersion, status: "DRAFT" },
    });

    await recordAIUsage(tx, {
      workspaceId,
      provider: credential.providerName,
      model: credential.model,
      operation: "GENERATE_PROPOSAL",
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });

    await logActivity(tx, {
      workspaceId,
      leadId: project.leadId,
      projectId,
      type: "proposal.additional_generated",
      description: openAdditionalProposal
        ? `Additional-scope proposal revised (v${nextVersion}, ${delta.deltaRequirements.length} new requirement${delta.deltaRequirements.length === 1 ? "" : "s"} added)`
        : `Additional-scope proposal generated (${delta.deltaRequirements.length} requirement${delta.deltaRequirements.length === 1 ? "" : "s"})`,
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/requirements`);
  return {
    message: openAdditionalProposal
      ? "Pending additional-scope proposal updated with the new requirement"
      : "Additional-scope proposal generated",
  };
}

// Step 1 of revising a REJECTED proposal: analyze the instruction against the
// current approved scope and the rejected content, and return a preview —
// nothing is written to Requirement/ProposalVersion here. The model's own
// revised content is generated now (not re-generated on confirm) so what the
// agency approves in the preview is exactly what gets saved, and so
// confirming never needs a second AI call.
export async function previewProposalRevisionAction(
  proposalId: string,
  instructionInput: string
): Promise<RevisionPreviewState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, project: { workspaceId } },
    include: {
      project: { include: { lead: true } },
      versions: { orderBy: { version: "desc" }, take: 1 },
      shares: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!proposal || !proposal.versions[0]) return { error: "Proposal not found" };
  if (proposal.shares[0]?.status === "ACCEPTED") {
    return { error: "The client already accepted this proposal — its content is locked." };
  }

  const instruction = instructionInput.trim();
  if (!instruction) {
    return { error: "Describe what you'd like to change." };
  }

  const latestRequirementVersion = await db.requirementVersion.findFirst({
    where: { projectId: proposal.projectId },
    orderBy: { version: "desc" },
  });
  if (!latestRequirementVersion) {
    return { error: "No approved scope found for this project." };
  }

  const snapshot = latestRequirementVersion.snapshot as unknown as {
    id: string;
    category: string;
    requirement: string;
    confidence: string;
  }[];

  const credential = await getDefaultAIProviderCredential(workspaceId);
  if (!credential) {
    return { error: "No AI provider is configured. Add one in Settings first." };
  }

  const existingContent = proposal.versions[0].content as unknown as ProposalContent;

  let result;
  try {
    result = await credential.provider.reviseProposal(credential.apiKey, credential.model, {
      leadName: proposal.project.lead.name,
      company: proposal.project.lead.company,
      industry: proposal.project.lead.industry,
      expectedTimeline: proposal.project.timeline,
      currentRequirements: snapshot.map((r) => ({
        id: r.id,
        category: r.category,
        requirement: r.requirement,
        confidence: r.confidence,
      })),
      existingProposal: existingContent,
      userInstruction: instruction,
    });
  } catch (error) {
    return { error: toSafeProviderErrorMessage(error) };
  }

  await recordAIUsage(db, {
    workspaceId,
    provider: credential.providerName,
    model: credential.model,
    operation: "REVISE_PROPOSAL",
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  });

  // Never trust a removal id the model returns without checking it against
  // the real current scope first — silently drop anything it hallucinated
  // rather than showing (or later applying) a removal that isn't real.
  const snapshotById = new Map(snapshot.map((r) => [r.id, r]));
  const requirementsToRemove = result.data.requirementsToRemove
    .filter((r) => snapshotById.has(r.id))
    .map((r) => ({ id: r.id, requirement: snapshotById.get(r.id)!.requirement }));

  const preview: ProposalRevisionPreview = {
    isScopeChange:
      result.data.isScopeChange &&
      (requirementsToRemove.length > 0 || result.data.requirementsToAdd.length > 0),
    summary: result.data.summary,
    requirementsToRemove,
    requirementsToAdd: result.data.requirementsToAdd,
    revisedProposal: result.data.revisedProposal,
    sourceRequirementVersionId: latestRequirementVersion.id,
  };

  return { preview };
}

const revisionConfirmSchema = z.object({
  sourceRequirementVersionId: z.string(),
  isScopeChange: z.boolean(),
  summary: z.string(),
  requirementsToRemove: z.array(z.object({ id: z.string(), requirement: z.string() })),
  requirementsToAdd: z.array(
    z.object({
      category: z.enum(["FUNCTIONAL", "NON_FUNCTIONAL", "INTEGRATION", "CONSTRAINT"]),
      requirement: z.string(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    })
  ),
  revisedProposal: proposalContentSchema,
});

// Step 2: apply exactly what was previewed. Requirements only get touched at
// all when the preview actually carries a scope change — a wording-only
// revision reuses the same requirementVersionId the rejected version already
// pointed to, so "don't unnecessarily modify Requirements" holds structurally,
// not just by convention.
export async function confirmProposalRevisionAction(
  proposalId: string,
  previewInput: unknown
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const user = await requireCurrentUser();

  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, project: { workspaceId } },
    include: {
      project: { select: { leadId: true } },
      versions: { orderBy: { version: "desc" }, take: 1 },
      shares: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!proposal || !proposal.versions[0]) return { error: "Proposal not found" };
  if (proposal.shares[0]?.status === "ACCEPTED") {
    return { error: "The client already accepted this proposal — its content is locked." };
  }

  // Re-validated here even though the client only ever sends back exactly
  // what this same server returned as a preview moments ago — this is a
  // server action endpoint, callable directly, not just from this form.
  const parsed = revisionConfirmSchema.safeParse(previewInput);
  if (!parsed.success) {
    return { error: "The revision preview was invalid — generate it again." };
  }
  const preview = parsed.data;

  const latestRequirementVersion = await db.requirementVersion.findFirst({
    where: { projectId: proposal.projectId },
    orderBy: { version: "desc" },
  });
  if (!latestRequirementVersion || latestRequirementVersion.id !== preview.sourceRequirementVersionId) {
    return {
      error: "The approved scope changed since this preview was generated — generate a new revision preview.",
    };
  }

  const nextProposalVersion = proposal.versions[0].version + 1;
  const hasScopeChange =
    preview.isScopeChange &&
    (preview.requirementsToRemove.length > 0 || preview.requirementsToAdd.length > 0);

  await db.$transaction(async (tx) => {
    let requirementVersionId = latestRequirementVersion.id;

    if (hasScopeChange) {
      const removeIds = preview.requirementsToRemove.map((r) => r.id);
      if (removeIds.length > 0) {
        // Marked Rejected, never deleted — same "keep the record of what
        // changed" rule as every other scope-removal path in this app.
        await tx.requirement.updateMany({
          where: { id: { in: removeIds }, projectId: proposal.projectId, status: "APPROVED" },
          data: { status: "REJECTED" },
        });
      }
      for (const item of preview.requirementsToAdd) {
        await tx.requirement.create({
          data: {
            projectId: proposal.projectId,
            category: item.category,
            requirement: item.requirement,
            status: "APPROVED",
            priority: item.priority,
            // The agency just explicitly confirmed this exact addition, so
            // there's no "extraction confidence" question the way there is
            // for AI-imported requirements — HIGH is the honest label.
            confidence: "HIGH",
          },
        });
      }

      const approvedRequirements = await tx.requirement.findMany({
        where: { projectId: proposal.projectId, status: "APPROVED" },
        orderBy: { createdAt: "asc" },
      });
      const nextReqVersion = latestRequirementVersion.version + 1;
      const newRequirementVersion = await tx.requirementVersion.create({
        data: {
          projectId: proposal.projectId,
          version: nextReqVersion,
          changesSummary: `AI proposal revision: ${preview.summary}`,
          snapshot: approvedRequirements.map((r) => ({
            id: r.id,
            category: r.category,
            requirement: r.requirement,
            status: r.status,
            priority: r.priority,
            confidence: r.confidence,
            evidence: r.evidence,
            notes: r.notes,
          })),
        },
      });
      requirementVersionId = newRequirementVersion.id;

      await logActivity(tx, {
        workspaceId,
        leadId: proposal.project.leadId,
        projectId: proposal.projectId,
        type: "requirements.approved",
        description: `Requirements approved (v${nextReqVersion}, ${approvedRequirements.length} items) — from proposal revision`,
      });
    }

    await tx.proposalVersion.create({
      data: {
        proposalId,
        version: nextProposalVersion,
        content: preview.revisedProposal,
        requirementVersionId,
        createdById: user.id,
      },
    });

    await tx.proposal.update({
      where: { id: proposalId },
      data: { currentVersion: nextProposalVersion, status: "DRAFT" },
    });

    // A share still reading Sent or Viewed now refers to content that no
    // longer exists — the client hasn't seen THIS version, so that badge
    // would be actively wrong otherwise. Reset it to Sent (never clearing
    // the real view history — first/last viewed and count stay factual).
    // A Rejected share is left alone: that's a preserved decision, only
    // reopened by the separate, explicit "Resend" action.
    const share = proposal.shares[0];
    if (share && share.status !== "REJECTED") {
      await tx.proposalShare.update({ where: { id: share.id }, data: { status: "SENT" } });
    }

    await logActivity(tx, {
      workspaceId,
      leadId: proposal.project.leadId,
      projectId: proposal.projectId,
      type: "proposal.revised",
      description: `Proposal revised via AI (v${nextProposalVersion}): ${preview.summary}`,
    });
  });

  revalidatePath(`/projects/${proposal.projectId}`);
  revalidatePath(`/projects/${proposal.projectId}/proposal`);
  revalidatePath(`/projects/${proposal.projectId}/requirements`);
  return { message: `Revised proposal generated (v${nextProposalVersion})` };
}

const optionalString = z
  .string()
  .nullish()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed && trimmed.length ? trimmed : undefined;
  });

function splitLines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const proposalEditSchema = z.object({
  coverTitle: z.string().trim().min(1, "Cover title is required"),
  executiveSummary: optionalString,
  businessUnderstanding: optionalString,
  proposedSolution: optionalString,
  timeline: optionalString,
  supportWarranty: optionalString,
  paymentTerms: optionalString,
});

export async function updateProposalContentAction(
  proposalId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, project: { workspaceId } },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      project: { select: { leadId: true } },
      shares: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!proposal || !proposal.versions[0]) return { error: "Proposal not found" };
  // Checked against the share, not proposal.status — an edit here always
  // leaves proposal.status wherever it already was, but a PRIOR regenerate
  // could already have knocked it off ACCEPTED even though the client's
  // decision (recorded on the share) never changed.
  if (proposal.shares[0]?.status === "ACCEPTED") {
    return { error: "The client already accepted this proposal — its content is locked." };
  }
  // A rejected version is a historical record of exactly what the client saw
  // and turned down — this action edits a ProposalVersion row IN PLACE
  // (no new version), so allowing it here would silently rewrite that
  // record. "Revise with AI" (which always creates a new version) is the
  // only path forward once rejected.
  if (proposal.shares[0]?.status === "REJECTED") {
    return { error: "This proposal was rejected — use \"Revise with AI\" instead of editing it directly." };
  }

  const parsed = proposalEditSchema.safeParse({
    coverTitle: formData.get("coverTitle"),
    executiveSummary: formData.get("executiveSummary"),
    businessUnderstanding: formData.get("businessUnderstanding"),
    proposedSolution: formData.get("proposedSolution"),
    timeline: formData.get("timeline"),
    supportWarranty: formData.get("supportWarranty"),
    paymentTerms: formData.get("paymentTerms"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = proposal.versions[0].content as unknown as ProposalContent;
  const updated: ProposalContent = {
    ...existing,
    coverTitle: parsed.data.coverTitle,
    executiveSummary: parsed.data.executiveSummary ?? "",
    businessUnderstanding: parsed.data.businessUnderstanding ?? "",
    proposedSolution: parsed.data.proposedSolution ?? "",
    timeline: parsed.data.timeline ?? "",
    supportWarranty: parsed.data.supportWarranty ?? "",
    paymentTerms: parsed.data.paymentTerms ?? "",
    scopeOfWork: splitLines(formData.get("scopeOfWork")),
    deliverables: splitLines(formData.get("deliverables")),
    technologyStack: splitLines(formData.get("technologyStack")),
    assumptions: splitLines(formData.get("assumptions")),
    outOfScope: splitLines(formData.get("outOfScope")),
    nextSteps: splitLines(formData.get("nextSteps")),
  };

  await db.$transaction(async (tx) => {
    await tx.proposalVersion.update({
      where: { id: proposal.versions[0].id },
      data: { content: updated },
    });

    // A manual edit addresses whatever's still open — resolved independently
    // of proposal.status, since a resend in between can already have reset
    // that back to SENT without the request actually being addressed.
    await resolveOpenChangeRequest(tx, proposal.id);

    // Only touches this one status; an ACCEPTED/SENT proposal keeps its
    // status on a content edit.
    if (proposal.status === "CHANGES_REQUESTED") {
      await tx.proposal.update({ where: { id: proposal.id }, data: { status: "DRAFT" } });
      await logActivity(tx, {
        workspaceId,
        leadId: proposal.project.leadId,
        projectId: proposal.projectId,
        type: "proposal.edited",
        description: "Proposal edited — change request addressed",
      });
    }

    // The share itself also needs to move off Changes Requested (or a stale
    // Sent/Viewed) once the content actually changes underneath it — same
    // rationale as confirmProposalRevisionAction. Never touches Rejected,
    // which stays a preserved decision until an explicit Resend.
    const share = proposal.shares[0];
    if (share && share.status !== "REJECTED" && share.status !== "SENT") {
      await tx.proposalShare.update({ where: { id: share.id }, data: { status: "SENT" } });
    }
  });

  revalidatePath(`/projects/${proposal.projectId}/proposal`);
  // Explicit ?id= — bare /proposal always resolves to the ORIGINAL proposal,
  // so without this an edit saved on an Additional proposal would redirect
  // to (and look like it landed on) a completely different document.
  redirect(`/projects/${proposal.projectId}/proposal?id=${proposalId}`);
}

// The manual counterpart to "Revise with AI" for a rejected proposal — same
// form, same fields, but (unlike updateProposalContentAction above) this
// always CREATES a new ProposalVersion rather than editing the rejected one
// in place, so a rep can fix wording directly without invoking AI while the
// immutability rule still holds structurally. Never touches Requirements —
// a manual edit here is wording-only by definition, so the new version
// reuses the exact requirementVersionId the rejected one already pointed to.
export async function reviseProposalManuallyAction(
  proposalId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const user = await requireCurrentUser();

  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, project: { workspaceId } },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      project: { select: { leadId: true } },
      shares: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!proposal || !proposal.versions[0]) return { error: "Proposal not found" };
  if (proposal.shares[0]?.status !== "REJECTED") {
    return { error: "This action is only for a rejected proposal." };
  }

  const parsed = proposalEditSchema.safeParse({
    coverTitle: formData.get("coverTitle"),
    executiveSummary: formData.get("executiveSummary"),
    businessUnderstanding: formData.get("businessUnderstanding"),
    proposedSolution: formData.get("proposedSolution"),
    timeline: formData.get("timeline"),
    supportWarranty: formData.get("supportWarranty"),
    paymentTerms: formData.get("paymentTerms"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = proposal.versions[0].content as unknown as ProposalContent;
  const updated: ProposalContent = {
    ...existing,
    coverTitle: parsed.data.coverTitle,
    executiveSummary: parsed.data.executiveSummary ?? "",
    businessUnderstanding: parsed.data.businessUnderstanding ?? "",
    proposedSolution: parsed.data.proposedSolution ?? "",
    timeline: parsed.data.timeline ?? "",
    supportWarranty: parsed.data.supportWarranty ?? "",
    paymentTerms: parsed.data.paymentTerms ?? "",
    scopeOfWork: splitLines(formData.get("scopeOfWork")),
    deliverables: splitLines(formData.get("deliverables")),
    technologyStack: splitLines(formData.get("technologyStack")),
    assumptions: splitLines(formData.get("assumptions")),
    outOfScope: splitLines(formData.get("outOfScope")),
    nextSteps: splitLines(formData.get("nextSteps")),
  };

  const nextVersion = proposal.versions[0].version + 1;

  await db.$transaction(async (tx) => {
    await tx.proposalVersion.create({
      data: {
        proposalId,
        version: nextVersion,
        content: updated,
        requirementVersionId: proposal.versions[0].requirementVersionId,
        createdById: user.id,
      },
    });

    await tx.proposal.update({
      where: { id: proposalId },
      data: { currentVersion: nextVersion, status: "DRAFT" },
    });

    await logActivity(tx, {
      workspaceId,
      leadId: proposal.project.leadId,
      projectId: proposal.projectId,
      type: "proposal.revised",
      description: `Proposal edited manually after rejection (v${nextVersion})`,
    });
  });

  revalidatePath(`/projects/${proposal.projectId}/proposal`);
  redirect(`/projects/${proposal.projectId}/proposal?id=${proposalId}`);
}

export type FollowUpState =
  | { error: string; message?: undefined }
  | { error?: undefined; message: string }
  | undefined;

// Deliberately never persisted or auto-sent — the spec calls for a draft the
// agency copies and sends themselves, never an automatic send.
export async function generateFollowUpAction(
  projectId: string,
  _prevState: FollowUpState,
  formData: FormData
): Promise<FollowUpState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    include: { lead: { select: { name: true } } },
  });
  if (!project) return { error: "Project not found" };

  const proposal = await db.proposal.findFirst({
    where: { projectId, kind: "ORIGINAL" },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      shares: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!proposal || !proposal.versions[0]) {
    return { error: "Generate and share a proposal first." };
  }
  if (proposal.shares[0]?.status === "ACCEPTED") {
    return { error: "The client already accepted this proposal — there's nothing left to follow up on." };
  }

  const credential = await getDefaultAIProviderCredential(workspaceId);
  if (!credential) {
    return { error: "No AI provider is configured. Add one in Settings first." };
  }

  const content = proposal.versions[0].content as unknown as ProposalContent;
  const share = proposal.shares[0];
  const daysSinceSent = share
    ? Math.floor((Date.now() - share.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let result;
  try {
    result = await credential.provider.generateFollowUp(credential.apiKey, credential.model, {
      leadName: project.lead.name,
      proposalTitle: content.coverTitle,
      daysSinceSent,
      hasBeenViewed: Boolean(share?.firstViewedAt),
    });
  } catch (error) {
    return { error: toSafeProviderErrorMessage(error) };
  }

  await recordAIUsage(db, {
    workspaceId,
    provider: credential.providerName,
    model: credential.model,
    operation: "GENERATE_FOLLOWUP",
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  });

  return { message: result.data.message };
}

const brandingOverrideSchema = z.object({
  accentColor: z
    .string()
    .nullish()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed && trimmed.length ? trimmed : null;
    })
    .refine((v) => v === null || /^#[0-9a-fA-F]{6}$/.test(v), {
      message: "Accent color must be a hex value like #166534",
    }),
  termsAndConditions: z
    .string()
    .nullish()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed && trimmed.length ? trimmed : null;
    }),
});

// Per-document overrides of the workspace's branding defaults (accent color,
// terms & conditions) — clearing a field reverts to the workspace default,
// it never duplicates it.
export async function updateProposalBrandingAction(
  proposalId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, project: { workspaceId } },
    include: { shares: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!proposal) return { error: "Proposal not found" };
  if (proposal.shares[0]?.status === "ACCEPTED") {
    return { error: "The client already accepted this proposal — its content is locked." };
  }

  const parsed = brandingOverrideSchema.safeParse({
    accentColor: formData.get("accentColor"),
    termsAndConditions: formData.get("termsAndConditions"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.proposal.update({
    where: { id: proposalId },
    data: { accentColor: parsed.data.accentColor, termsAndConditions: parsed.data.termsAndConditions },
  });

  revalidatePath(`/projects/${proposal.projectId}/proposal`);
  return { message: "Branding updated for this proposal" };
}
