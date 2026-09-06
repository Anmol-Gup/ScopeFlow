"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";
import { generateSecureToken } from "@/lib/tokens";

// Direct structural mirror of proposal-share.ts — same public accept/reject
// flow, same never-trust-a-second-unverified-ID discipline, but for
// Quotation (spec only calls for Draft/Sent/Accepted/Rejected/Superseded —
// no client "request changes" state, unlike Proposal).

export type ActionState = { error?: string; message?: string } | undefined;

const SHARE_EXPIRY_DAYS = 30;

export async function createQuotationShareAction(quotationId: string): Promise<void> {
  const { workspaceId } = await requireWorkspaceAccess();
  const quotation = await db.quotation.findFirst({ where: { id: quotationId, project: { workspaceId } } });
  if (!quotation) return;

  // projectId comes from the already-verified quotation, never from an
  // independently client-supplied argument — never trust a second ID that
  // hasn't itself been checked against workspace ownership.
  const projectId = quotation.projectId;

  const existing = await db.quotationShare.findFirst({ where: { quotationId } });
  if (!existing) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SHARE_EXPIRY_DAYS);

    await db.$transaction(async (tx) => {
      await tx.quotationShare.create({
        data: { quotationId, token: generateSecureToken(), expiresAt, status: "SENT" },
      });
      await tx.quotation.update({ where: { id: quotationId }, data: { status: "SENT" } });

      const project = await tx.project.findUnique({ where: { id: projectId } });
      await logActivity(tx, {
        workspaceId,
        leadId: project?.leadId,
        projectId,
        type: "quotation.shared",
        description: "Secure quotation link generated",
      });
    });
  }

  revalidatePath(`/projects/${projectId}/quotation`);
  revalidatePath(`/projects/${projectId}`);
}

// Re-opens an existing share for a fresh decision after a rejection — the
// only way a client can ever act on a quotation again once they've said no,
// since neither editing items in place nor starting a new version touches
// share/quotation status. Mirrors resendProposalShareAction. Never usable
// once ACCEPTED — that's a full, permanent lock (see updateQuotationAction).
export async function resendQuotationShareAction(quotationId: string): Promise<void> {
  const { workspaceId } = await requireWorkspaceAccess();
  const quotation = await db.quotation.findFirst({
    where: { id: quotationId, project: { workspaceId } },
    include: { project: { select: { leadId: true } } },
  });
  if (!quotation) return;

  const share = await db.quotationShare.findFirst({ where: { quotationId } });
  if (!share) return;
  if (share.status === "ACCEPTED") return;

  await db.$transaction(async (tx) => {
    await tx.quotationShare.update({
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
    await tx.quotation.update({ where: { id: quotationId }, data: { status: "SENT" } });
    await logActivity(tx, {
      workspaceId,
      leadId: quotation.project.leadId,
      projectId: quotation.projectId,
      type: "quotation.resent",
      description: "Updated quotation re-sent to the client for a new decision",
    });
  });

  revalidatePath(`/projects/${quotation.projectId}/quotation`);
  revalidatePath(`/projects/${quotation.projectId}`);
}

async function requireActiveShare(token: string) {
  const share = await db.quotationShare.findUnique({
    where: { token },
    include: { quotation: { include: { project: { include: { lead: true } } } } },
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

export async function acceptQuotationAction(
  token: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const share = await requireActiveShare(token);
  if (!share) return { error: "This link is invalid or has expired." };
  if (isTerminalStatus(share.status)) {
    return { error: "This quotation has already been responded to." };
  }

  const parsed = acceptSchema.safeParse({ name: formData.get("name"), email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const projectId = share.quotation.projectId;
  const leadId = share.quotation.project.leadId;
  const workspaceId = share.quotation.project.workspaceId;

  await db.$transaction(async (tx) => {
    await tx.quotationShare.update({
      where: { id: share.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByName: parsed.data.name,
        acceptedByEmail: parsed.data.email,
        respondedAt: new Date(),
      },
    });
    await tx.quotation.update({ where: { id: share.quotationId }, data: { status: "ACCEPTED" } });
    // ORIGINAL quotation acceptance moves the existing Project into delivery
    // ("In Progress") — it never creates a new Project. An ADDITIONAL
    // quotation's acceptance contributes to the project's commercial value
    // (computed on read — see lib/projects/commercial-value.ts) but must not
    // force the project's status, which may have moved on since.
    if (share.quotation.kind === "ORIGINAL") {
      await tx.project.update({ where: { id: projectId }, data: { status: "ACTIVE" } });
    }
    await logActivity(tx, {
      workspaceId,
      leadId,
      projectId,
      type: "quotation.accepted",
      description: `Quotation accepted by ${parsed.data.name} (${parsed.data.email})`,
    });
  });

  revalidatePath(`/q/${token}`);
  return { message: "Thank you — your acceptance has been recorded." };
}

const rejectSchema = z.object({
  reason: z.string().trim().nullish(),
});

export async function rejectQuotationAction(
  token: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const share = await requireActiveShare(token);
  if (!share) return { error: "This link is invalid or has expired." };
  if (isTerminalStatus(share.status)) {
    return { error: "This quotation has already been responded to." };
  }

  const parsed = rejectSchema.safeParse({ reason: formData.get("reason") });
  const reason = parsed.success ? parsed.data.reason?.trim() || undefined : undefined;

  const projectId = share.quotation.projectId;
  const leadId = share.quotation.project.leadId;
  const workspaceId = share.quotation.project.workspaceId;

  await db.$transaction(async (tx) => {
    await tx.quotationShare.update({
      where: { id: share.id },
      data: { status: "REJECTED", respondedAt: new Date(), rejectionReason: reason ?? null },
    });
    await tx.quotation.update({ where: { id: share.quotationId }, data: { status: "REJECTED" } });
    await logActivity(tx, {
      workspaceId,
      leadId,
      projectId,
      type: "quotation.rejected",
      description: reason ? `Quotation rejected: "${reason}"` : "Quotation rejected",
    });
  });

  revalidatePath(`/q/${token}`);
  return { message: "Thank you for letting us know." };
}
