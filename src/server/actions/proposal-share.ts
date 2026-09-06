"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";
import { generateSecureToken } from "@/lib/tokens";

export type ActionState = { error?: string; message?: string } | undefined;

const SHARE_EXPIRY_DAYS = 30;
const EARLY_STATUSES = ["NEW", "CONTACTED"];

export async function createProposalShareAction(proposalId: string): Promise<void> {
  const { workspaceId } = await requireWorkspaceAccess();
  const proposal = await db.proposal.findFirst({ where: { id: proposalId, project: { workspaceId } } });
  if (!proposal) return;

  // projectId/leadId come from the already-verified proposal, never from an
  // independently client-supplied argument — never trust a second ID that
  // hasn't itself been checked against workspace ownership.
  const projectId = proposal.projectId;

  const existing = await db.proposalShare.findFirst({ where: { proposalId } });
  if (!existing) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SHARE_EXPIRY_DAYS);

    await db.$transaction(async (tx) => {
      await tx.proposalShare.create({
        data: { proposalId, token: generateSecureToken(), expiresAt, status: "SENT" },
      });
      await tx.proposal.update({ where: { id: proposalId }, data: { status: "SENT" } });

      const project = await tx.project.findUnique({ where: { id: projectId }, include: { lead: true } });
      if (project && EARLY_STATUSES.includes(project.lead.status)) {
        await tx.lead.update({ where: { id: project.leadId }, data: { status: "ACTIVE" } });
      }
      await logActivity(tx, {
        workspaceId,
        leadId: project?.leadId,
        projectId,
        type: "proposal.shared",
        description: "Secure proposal link generated",
      });
    });
  }

  revalidatePath(`/projects/${projectId}/proposal`);
  revalidatePath(`/projects/${projectId}`);
}

// Re-opens an existing share for a fresh decision — needed whenever the
// proposal is regenerated after the client already accepted/rejected the
// previous version (Case 2: scope changed before the quotation was
// accepted). The prior decision stays fully preserved in the Activity log
// and the superseded ProposalVersion itself; only this share row's live
// status/decision fields reset so the same link works again.
export async function resendProposalShareAction(proposalId: string): Promise<void> {
  const { workspaceId } = await requireWorkspaceAccess();
  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, project: { workspaceId } },
    include: { project: { select: { leadId: true } } },
  });
  if (!proposal) return;

  const share = await db.proposalShare.findFirst({ where: { proposalId } });
  if (!share) return;
  // An accepted proposal is fully locked — content can't change, so there's
  // nothing to reopen a decision about. Rejected proposals are unaffected;
  // resending after a rejection is still the intended "try again" path.
  if (share.status === "ACCEPTED") return;

  const lead = await db.lead.findUnique({ where: { id: proposal.project.leadId }, select: { status: true } });

  await db.$transaction(async (tx) => {
    await tx.proposalShare.update({
      where: { id: share.id },
      data: {
        status: "SENT",
        acceptedAt: null,
        acceptedByName: null,
        acceptedByEmail: null,
        respondedAt: null,
        rejectionReason: null,
      },
    });
    await tx.proposal.update({ where: { id: proposalId }, data: { status: "SENT" } });

    // Reopening the decision makes a prior WON/LOST stale — a "won" deal
    // whose proposal is once again awaiting a client decision is misleading.
    // Only touches WON/LOST; leaves NEW/CONTACTED/ACTIVE alone.
    if (lead && (lead.status === "WON" || lead.status === "LOST")) {
      await tx.lead.update({ where: { id: proposal.project.leadId }, data: { status: "ACTIVE" } });
      await logActivity(tx, {
        workspaceId,
        leadId: proposal.project.leadId,
        projectId: proposal.projectId,
        type: "lead.status_changed",
        description: "Status changed to Active — proposal decision reopened",
      });
    }

    await logActivity(tx, {
      workspaceId,
      leadId: proposal.project.leadId,
      projectId: proposal.projectId,
      type: "proposal.resent",
      description: "Updated proposal re-sent to the client for a new decision",
    });
  });

  revalidatePath(`/projects/${proposal.projectId}/proposal`);
  revalidatePath(`/projects/${proposal.projectId}`);
}

async function requireActiveShare(token: string) {
  const share = await db.proposalShare.findUnique({
    where: { token },
    include: {
      proposal: {
        include: {
          project: { include: { lead: true } },
          versions: { orderBy: { version: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!share) return null;
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) return null;
  return share;
}

function isTerminalStatus(status: string) {
  return status === "ACCEPTED" || status === "REJECTED";
}

const acceptSchema = z.object({
  name: z.string().trim().min(1, "Your name is required"),
  email: z.string().trim().email("Enter a valid email"),
});

export async function acceptProposalAction(
  token: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const share = await requireActiveShare(token);
  if (!share) return { error: "This link is invalid or has expired." };
  if (isTerminalStatus(share.status)) {
    return { error: "This proposal has already been responded to." };
  }

  const parsed = acceptSchema.safeParse({ name: formData.get("name"), email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const projectId = share.proposal.projectId;
  const leadId = share.proposal.project.leadId;
  const workspaceId = share.proposal.project.workspaceId;

  await db.$transaction(async (tx) => {
    await tx.proposalShare.update({
      where: { id: share.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByName: parsed.data.name,
        acceptedByEmail: parsed.data.email,
        respondedAt: new Date(),
      },
    });
    await tx.proposal.update({ where: { id: share.proposalId }, data: { status: "ACCEPTED" } });
    await tx.lead.update({ where: { id: leadId }, data: { status: "WON" } });
    await logActivity(tx, {
      workspaceId,
      leadId,
      projectId,
      type: "proposal.accepted",
      description: `Proposal accepted by ${parsed.data.name} (${parsed.data.email})`,
    });

    // Scope changed and the ORIGINAL proposal was re-accepted with the
    // complete current scope — any quotation already sent for the old scope
    // no longer reflects reality. Supersede it; createQuotationAction will
    // then create a fresh ORIGINAL quotation for the new scope. Never
    // touches an ADDITIONAL proposal's acceptance.
    if (share.proposal.kind === "ORIGINAL") {
      const staleQuotation = await tx.quotation.findFirst({
        where: {
          projectId,
          kind: "ORIGINAL",
          status: { notIn: ["ACCEPTED", "SUPERSEDED", "REJECTED", "EXPIRED"] },
        },
      });
      if (staleQuotation) {
        await tx.quotation.update({ where: { id: staleQuotation.id }, data: { status: "SUPERSEDED" } });
        await logActivity(tx, {
          workspaceId,
          leadId,
          projectId,
          type: "quotation.superseded",
          description: "Previous quotation superseded — scope changed before it was accepted",
        });
      }
    }
  });

  revalidatePath(`/p/${token}`);
  return { message: "Thank you — your acceptance has been recorded." };
}

const changesSchema = z.object({
  message: z.string().trim().min(1, "Let the agency know what you'd like changed"),
});

export async function requestProposalChangesAction(
  token: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const share = await requireActiveShare(token);
  if (!share) return { error: "This link is invalid or has expired." };
  if (isTerminalStatus(share.status)) {
    return { error: "This proposal has already been responded to." };
  }

  const parsed = changesSchema.safeParse({ message: formData.get("message") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const projectId = share.proposal.projectId;
  const leadId = share.proposal.project.leadId;
  const workspaceId = share.proposal.project.workspaceId;
  const currentVersion = share.proposal.versions[0];

  await db.$transaction(async (tx) => {
    await tx.proposalShare.update({
      where: { id: share.id },
      data: { status: "CHANGES_REQUESTED" },
    });
    await tx.proposal.update({
      where: { id: share.proposalId },
      data: { status: "CHANGES_REQUESTED" },
    });
    // Durable, queryable record of what the client asked for — shown on the
    // Proposal page, Project page, and Dashboard "Needs Your Attention" so
    // it's never only a free-text Activity entry the sales rep might miss.
    if (currentVersion) {
      await tx.proposalChangeRequest.create({
        data: {
          projectId,
          proposalId: share.proposalId,
          proposalVersionId: currentVersion.id,
          message: parsed.data.message,
        },
      });
    }
    await logActivity(tx, {
      workspaceId,
      leadId,
      projectId,
      type: "proposal.changes_requested",
      description: `Client requested changes: "${parsed.data.message.slice(0, 200)}"`,
      metadata: { message: parsed.data.message },
    });
  });

  revalidatePath(`/p/${token}`);
  return { message: "Thanks — the agency has been notified of your requested changes." };
}

const rejectSchema = z.object({
  reason: z.string().trim().nullish(),
});

export async function rejectProposalAction(
  token: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const share = await requireActiveShare(token);
  if (!share) return { error: "This link is invalid or has expired." };
  if (isTerminalStatus(share.status)) {
    return { error: "This proposal has already been responded to." };
  }

  const parsed = rejectSchema.safeParse({ reason: formData.get("reason") });
  const reason = parsed.success ? parsed.data.reason?.trim() || undefined : undefined;

  const projectId = share.proposal.projectId;
  const leadId = share.proposal.project.leadId;
  const workspaceId = share.proposal.project.workspaceId;

  await db.$transaction(async (tx) => {
    await tx.proposalShare.update({
      where: { id: share.id },
      data: { status: "REJECTED", respondedAt: new Date(), rejectionReason: reason ?? null },
    });
    await tx.proposal.update({ where: { id: share.proposalId }, data: { status: "REJECTED" } });
    await tx.lead.update({ where: { id: leadId }, data: { status: "LOST" } });
    await logActivity(tx, {
      workspaceId,
      leadId,
      projectId,
      type: "proposal.rejected",
      description: reason ? `Proposal rejected: "${reason}"` : "Proposal rejected",
    });
  });

  revalidatePath(`/p/${token}`);
  return { message: "Thank you for letting us know." };
}
