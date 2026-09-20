"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";
import { getDefaultAIProviderCredential } from "@/lib/ai";
import { recordAIUsage } from "@/lib/ai/usage";
import { toSafeProviderErrorMessage } from "@/lib/ai/errors";
import { computeQuotationTotals, type QuotationItemInput } from "@/lib/pricing";
import type { NegotiationSuggestion } from "@/lib/ai/schemas";

export type ActionState = { error?: string; message?: string } | undefined;

// A Quotation can only be created once the project's current ORIGINAL
// Proposal has been accepted by the client — never for a Draft/Sent/Viewed/
// Changes Requested proposal, and never with no proposal at all. A prior
// ORIGINAL quotation that's been superseded (scope changed before it was
// accepted) doesn't block a fresh one — see acceptProposalAction, which is
// what marks the old one superseded in the first place.
export async function createQuotationAction(projectId: string): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const project = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) return { error: "Project not found" };

  const proposal = await db.proposal.findFirst({
    where: { projectId, kind: "ORIGINAL" },
    include: { versions: { orderBy: { version: "desc" }, take: 1, select: { requirementVersionId: true } } },
  });
  if (!proposal || proposal.status !== "ACCEPTED") {
    return { error: "The proposal must be accepted by the client before a quotation can be created." };
  }
  const requirementVersionId = proposal.versions[0]?.requirementVersionId;
  if (!requirementVersionId) {
    return { error: "The accepted proposal has no requirement snapshot to price." };
  }

  let quotation = await db.quotation.findFirst({
    where: { projectId, kind: "ORIGINAL", status: { not: "SUPERSEDED" } },
  });
  if (!quotation) {
    quotation = await db.$transaction(async (tx) => {
      const created = await tx.quotation.create({
        data: { projectId, kind: "ORIGINAL", proposalId: proposal.id, status: "DRAFT", currentVersion: 1 },
      });
      await tx.quotationVersion.create({
        data: {
          quotationId: created.id,
          version: 1,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: 0,
          subtotal: 0,
          taxAmount: 0,
          total: 0,
          requirementVersionId,
        },
      });
      await logActivity(tx, {
        workspaceId,
        leadId: project.leadId,
        projectId,
        type: "quotation.created",
        description: "Quotation created",
      });
      return created;
    });
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/quotation`);
}

// Case 3: prices an Additional/Change proposal that's already been accepted
// by the client — a wholly separate document from the project's ORIGINAL
// quotation, never touching it.
export async function createAdditionalQuotationAction(
  projectId: string,
  proposalId: string
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const project = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) return { error: "Project not found" };

  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, projectId, kind: "ADDITIONAL" },
    include: { versions: { orderBy: { version: "desc" }, take: 1, select: { requirementVersionId: true } } },
  });
  if (!proposal || proposal.status !== "ACCEPTED") {
    return { error: "This additional proposal must be accepted by the client before a quotation can be created." };
  }
  const requirementVersionId = proposal.versions[0]?.requirementVersionId;
  if (!requirementVersionId) {
    return { error: "The accepted proposal has no requirement snapshot to price." };
  }

  const existing = await db.quotation.findFirst({ where: { proposalId: proposal.id } });
  if (existing) {
    redirect(`/projects/${projectId}/quotation?id=${existing.id}`);
  }

  // An additional-scope quotation from an earlier round that hasn't been
  // decided yet (not Accepted/Rejected) absorbs pricing for this proposal
  // too, rather than a second, disconnected quotation being created
  // alongside it — same "one live document per scope round" rule already
  // applied to generateAdditionalProposalAction. The project page routes
  // here to the existing one instead of showing this action once one is
  // open, but this is re-checked server-side since it's a real guard, not
  // just a UI nicety.
  const openAdditionalQuotation = await db.quotation.findFirst({
    where: { projectId, kind: "ADDITIONAL", status: { notIn: ["ACCEPTED", "REJECTED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (openAdditionalQuotation) {
    return {
      error:
        "An additional-scope quotation is already open for this project — add this proposal's pricing to it directly instead of creating a separate one.",
    };
  }

  const quotation = await db.$transaction(async (tx) => {
    const created = await tx.quotation.create({
      data: { projectId, kind: "ADDITIONAL", proposalId: proposal.id, status: "DRAFT", currentVersion: 1 },
    });
    await tx.quotationVersion.create({
      data: {
        quotationId: created.id,
        version: 1,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 0,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        requirementVersionId,
      },
    });
    await logActivity(tx, {
      workspaceId,
      leadId: project.leadId,
      projectId,
      type: "quotation.additional_created",
      description: "Additional-scope quotation created",
    });
    return created;
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/quotation?id=${quotation.id}`);
}

const quotationItemSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100),
  serviceId: z.string().nullish(),
});

const updateQuotationSchema = z.object({
  itemsJson: z.string(),
  discountPercent: z.string(),
  taxRate: z.string(),
  paymentTerms: z.string().nullish(),
});

export async function updateQuotationAction(
  quotationId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const quotation = await db.quotation.findFirst({
    where: { id: quotationId, project: { workspaceId } },
    include: { versions: { orderBy: { version: "desc" }, take: 1 }, project: { select: { leadId: true } } },
  });
  if (!quotation || !quotation.versions[0]) return { error: "Quotation not found" };
  if (quotation.status === "ACCEPTED") {
    return { error: "The client already accepted this quotation — its content is locked." };
  }

  const parsedForm = updateQuotationSchema.safeParse({
    itemsJson: formData.get("itemsJson"),
    discountPercent: formData.get("discountPercent"),
    taxRate: formData.get("taxRate"),
    paymentTerms: formData.get("paymentTerms"),
  });
  if (!parsedForm.success) {
    return { error: "Invalid input" };
  }

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(parsedForm.data.itemsJson);
  } catch {
    return { error: "Could not read the line items" };
  }
  const itemsParsed = z.array(quotationItemSchema).safeParse(rawItems);
  if (!itemsParsed.success) {
    return { error: "One or more line items are invalid" };
  }

  // A serviceId is only ever a display/traceability link back to the
  // workspace's own Service Library — never trust one supplied by the client
  // without confirming it actually belongs to this workspace.
  const requestedServiceIds = [
    ...new Set(itemsParsed.data.map((i) => i.serviceId).filter((id): id is string => Boolean(id))),
  ];
  const ownedServiceIds =
    requestedServiceIds.length > 0
      ? new Set(
          (
            await db.service.findMany({
              where: { id: { in: requestedServiceIds }, workspaceId },
              select: { id: true },
            })
          ).map((s) => s.id)
        )
      : new Set<string>();
  const itemsWithVerifiedServiceIds = itemsParsed.data.map((item) => ({
    ...item,
    serviceId: item.serviceId && ownedServiceIds.has(item.serviceId) ? item.serviceId : null,
  }));

  const discountPercent = Number(parsedForm.data.discountPercent) || 0;
  const taxRate = Number(parsedForm.data.taxRate) || 0;
  const paymentTerms = parsedForm.data.paymentTerms?.trim() || null;

  const computed = computeQuotationTotals(
    itemsWithVerifiedServiceIds as QuotationItemInput[],
    discountPercent,
    taxRate
  );

  const currentVersion = quotation.versions[0];
  // A rejected version's numbers are a real historical record ("the client
  // saw and declined these exact figures") — editing must never silently
  // overwrite them. Instead of requiring a separate manual "start new
  // version" step, saving here automatically checkpoints the rejected
  // version and applies the edit to a fresh one. Anything not yet decided
  // (DRAFT/SENT/VIEWED) still edits in place, same as before.
  const startNewVersion = quotation.status === "REJECTED";

  await db.$transaction(async (tx) => {
    const versionId = startNewVersion
      ? (
          await tx.quotationVersion.create({
            data: {
              quotationId,
              version: currentVersion.version + 1,
              requirementVersionId: currentVersion.requirementVersionId,
              discountPercent: 0,
              discountAmount: 0,
              taxRate: 0,
              subtotal: 0,
              taxAmount: 0,
              total: 0,
            },
          })
        ).id
      : currentVersion.id;

    if (startNewVersion) {
      await tx.quotation.update({
        where: { id: quotationId },
        data: { currentVersion: currentVersion.version + 1 },
      });
    } else {
      await tx.quotationItem.deleteMany({ where: { quotationVersionId: versionId } });
    }

    if (computed.items.length > 0) {
      await tx.quotationItem.createMany({
        data: computed.items.map((item, index) => ({
          quotationVersionId: versionId,
          serviceId: item.serviceId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          lineTotal: item.lineTotal,
          sortOrder: index,
        })),
      });
    }
    await tx.quotationVersion.update({
      where: { id: versionId },
      data: {
        discountPercent,
        discountAmount: computed.discountAmount,
        taxRate,
        subtotal: computed.subtotal,
        taxAmount: computed.taxAmount,
        total: computed.total,
        paymentTerms,
      },
    });
    await logActivity(tx, {
      workspaceId,
      leadId: quotation.project.leadId,
      projectId: quotation.projectId,
      type: "quotation.updated",
      description: startNewVersion
        ? `Quotation revised after rejection (v${currentVersion.version + 1}, total ${computed.total})`
        : `Quotation updated (v${currentVersion.version}, total ${computed.total})`,
    });
  });

  revalidatePath(`/projects/${quotation.projectId}/quotation`);
  // Explicit ?id= — bare /quotation always resolves to the ORIGINAL
  // quotation, so without this, saving an Additional quotation's line items
  // would redirect to (and look like it landed on) a different document.
  redirect(`/projects/${quotation.projectId}/quotation?id=${quotationId}`);
}

export type SuggestNegotiationState =
  | { error: string; data?: undefined }
  | { error?: undefined; data: NegotiationSuggestion & { totalEstimatedSavings: number } }
  | undefined;

export async function suggestNegotiationAction(
  quotationId: string,
  _prevState: SuggestNegotiationState,
  formData: FormData
): Promise<SuggestNegotiationState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const quotation = await db.quotation.findFirst({
    where: { id: quotationId, project: { workspaceId } },
    include: {
      project: { select: { budget: true, lead: { select: { name: true } } } },
      versions: { orderBy: { version: "desc" }, take: 1, include: { items: true } },
    },
  });
  if (!quotation || !quotation.versions[0]) return { error: "Quotation not found" };
  const version = quotation.versions[0];
  if (version.items.length === 0) {
    return { error: "Add line items before asking for negotiation suggestions." };
  }

  const credential = await getDefaultAIProviderCredential(workspaceId);
  if (!credential) {
    return { error: "No AI provider is configured. Add one in Settings first." };
  }

  const targetBudgetRaw = String(formData.get("targetBudget") ?? "").trim();
  const targetBudget = targetBudgetRaw
    ? Number(targetBudgetRaw)
    : quotation.project.budget
      ? Number(quotation.project.budget)
      : null;

  let result;
  try {
    result = await credential.provider.suggestNegotiation(credential.apiKey, credential.model, {
      leadName: quotation.project.lead.name,
      targetBudget,
      currentTotal: Number(version.total),
      items: version.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
    });
  } catch (error) {
    return { error: toSafeProviderErrorMessage(error) };
  }

  // Only keep suggestions that reference a real line item — never trust the
  // model's own numbers, and discard anything it may have invented.
  const itemsByDescription = new Map(version.items.map((i) => [i.description.trim().toLowerCase(), i]));
  const matchedSuggestions = result.data.suggestions.filter((s) =>
    itemsByDescription.has(s.itemDescription.trim().toLowerCase())
  );
  const totalEstimatedSavings = matchedSuggestions.reduce((sum, s) => {
    const item = itemsByDescription.get(s.itemDescription.trim().toLowerCase())!;
    const lineTotal = Number(item.lineTotal);
    if (s.action === "REMOVE" || s.action === "DEFER_TO_PHASE_2") {
      return sum + lineTotal;
    }
    if (s.action === "REDUCE_QUANTITY" && s.suggestedQuantity !== undefined) {
      const unitPrice = Number(item.unitPrice);
      const discountPercent = Number(item.discountPercent);
      const newTotal = Math.max(0, unitPrice * s.suggestedQuantity * (1 - discountPercent / 100));
      return sum + Math.max(0, lineTotal - newTotal);
    }
    return sum;
  }, 0);

  await recordAIUsage(db, {
    workspaceId,
    provider: credential.providerName,
    model: credential.model,
    operation: "SUGGEST_NEGOTIATION",
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  });

  return {
    data: {
      summary: result.data.summary,
      suggestions: matchedSuggestions,
      totalEstimatedSavings: Math.round(totalEstimatedSavings * 100) / 100,
    },
  };
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
export async function updateQuotationBrandingAction(
  quotationId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const quotation = await db.quotation.findFirst({ where: { id: quotationId, project: { workspaceId } } });
  if (!quotation) return { error: "Quotation not found" };
  if (quotation.status === "ACCEPTED") {
    return { error: "The client already accepted this quotation — its content is locked." };
  }

  const parsed = brandingOverrideSchema.safeParse({
    accentColor: formData.get("accentColor"),
    termsAndConditions: formData.get("termsAndConditions"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.quotation.update({
    where: { id: quotationId },
    data: { accentColor: parsed.data.accentColor, termsAndConditions: parsed.data.termsAndConditions },
  });

  revalidatePath(`/projects/${quotation.projectId}/quotation`);
  return { message: "Branding updated for this quotation" };
}
