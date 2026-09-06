"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";
import { getLockedRequirementIds, getRequirementIdsCoveredByAnyProposal } from "@/lib/requirements/scope";
import type { Prisma } from "@/generated/prisma/client";

export type ActionState = { error?: string; message?: string } | undefined;

// `.nullish()` (not `.optional()`) because FormData.get() returns null — not
// undefined — for a field that isn't present in the submitted form at all.
const optionalString = z
  .string()
  .nullish()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed && trimmed.length ? trimmed : undefined;
  });

const EARLY_STATUSES = ["NEW", "CONTACTED"] as const;

async function advanceLeadToReview(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  leadId: string,
  leadStatus: string
) {
  if (!EARLY_STATUSES.includes(leadStatus as (typeof EARLY_STATUSES)[number])) return;
  await tx.lead.update({ where: { id: leadId }, data: { status: "ACTIVE" } });
  await logActivity(tx, {
    workspaceId,
    leadId,
    type: "lead.status_changed",
    description: "Status changed to Active",
  });
}

async function requireProjectAccess(projectId: string, workspaceId: string) {
  return db.project.findFirst({
    where: { id: projectId, workspaceId },
    include: { lead: { select: { id: true, status: true } } },
  });
}

const requirementSchema = z.object({
  category: z.enum(["FUNCTIONAL", "NON_FUNCTIONAL", "INTEGRATION", "CONSTRAINT"]),
  requirement: z.string().trim().min(1, "Requirement text is required"),
  status: z.enum(["PENDING_APPROVAL", "APPROVED", "REJECTED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  evidence: optionalString,
  notes: optionalString,
});

function parseRequirementForm(formData: FormData) {
  return requirementSchema.safeParse({
    category: formData.get("category"),
    requirement: formData.get("requirement"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    confidence: formData.get("confidence"),
    evidence: formData.get("evidence"),
    notes: formData.get("notes"),
  });
}

export async function createRequirementAction(
  projectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const project = await requireProjectAccess(projectId, workspaceId);
  if (!project) return { error: "Project not found" };

  const parsed = parseRequirementForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.requirement.create({ data: { projectId, ...data } });
    await advanceLeadToReview(tx, workspaceId, project.leadId, project.lead.status);
    await logActivity(tx, {
      workspaceId,
      leadId: project.leadId,
      projectId,
      type: "requirement.added",
      description: "Requirement added manually",
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/requirements`);
  return { message: "Requirement added" };
}

export async function updateRequirementAction(
  requirementId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const requirement = await db.requirement.findFirst({
    where: { id: requirementId, project: { workspaceId } },
  });
  if (!requirement) return { error: "Requirement not found" };

  const parsed = parseRequirementForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Once a requirement is part of ANY proposal version — draft, sent,
  // viewed, or rejected, not just an accepted one — a plain text edit here
  // is a no-op that can never reach the client: that proposal is a frozen
  // snapshot, blind regenerate is blocked the moment a version exists, and
  // nothing re-pulls a live-row edit into a new version short of locking a
  // new scope version and going through "Revise with AI" (or a manual
  // proposal edit). Silently accepting the edit would make it look saved
  // while actually going nowhere, so block it here and point at the path
  // that does work.
  const contentChanged =
    parsed.data.requirement !== requirement.requirement || parsed.data.category !== requirement.category;
  if (contentChanged) {
    const proposalCoveredIds = await getRequirementIdsCoveredByAnyProposal(requirement.projectId);
    if (proposalCoveredIds.has(requirementId)) {
      return {
        error:
          "This requirement is already part of a proposal — its content can't be edited directly. Mark it Rejected and add a new requirement instead, or use \"Revise with AI\" on the proposal to update it.",
      };
    }
  }

  await db.requirement.update({ where: { id: requirementId }, data: parsed.data });

  revalidatePath(`/projects/${requirement.projectId}/requirements`);
  return { message: "Requirement updated" };
}

const QUICK_FIELDS = ["status", "priority"] as const;
const STATUS_VALUES = ["PENDING_APPROVAL", "APPROVED", "REJECTED"] as const;
const PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH"] as const;

export async function updateRequirementQuickFieldAction(formData: FormData): Promise<void> {
  const { workspaceId } = await requireWorkspaceAccess();
  const requirementId = String(formData.get("requirementId") ?? "");
  const field = String(formData.get("field") ?? "");
  const value = String(formData.get("value") ?? "");

  if (!QUICK_FIELDS.includes(field as (typeof QUICK_FIELDS)[number])) return;
  if (field === "status" && !STATUS_VALUES.includes(value as (typeof STATUS_VALUES)[number])) return;
  if (field === "priority" && !PRIORITY_VALUES.includes(value as (typeof PRIORITY_VALUES)[number])) return;

  const requirement = await db.requirement.findFirst({
    where: { id: requirementId, project: { workspaceId } },
  });
  if (!requirement) return;

  await db.requirement.update({
    where: { id: requirementId },
    data: { [field]: value },
  });

  revalidatePath(`/projects/${requirement.projectId}/requirements`);
}

export async function deleteRequirementAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const requirementId = String(formData.get("requirementId") ?? "");

  const requirement = await db.requirement.findFirst({
    where: { id: requirementId, project: { workspaceId } },
    include: { project: { select: { leadId: true } } },
  });
  if (!requirement) return { error: "Requirement not found" };

  // Once a requirement has ever been locked into an approved-scope version —
  // whether or not a proposal/quotation has actually been generated from it
  // yet — it's already a commitment checkpoint. Deleting it can't corrupt
  // the frozen snapshot, but it would silently vanish from the live list
  // while a future "Generate" click could still pull it back in from that
  // same lock. Mark it Rejected instead to keep the record of what changed.
  const locked = await getLockedRequirementIds(requirement.projectId);
  if (locked.has(requirementId)) {
    return {
      error:
        "This requirement is already part of a locked scope version — it can't be deleted. Mark it Rejected instead to keep the record of what changed.",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.requirement.delete({ where: { id: requirementId } });
    await logActivity(tx, {
      workspaceId,
      leadId: requirement.project.leadId,
      projectId: requirement.projectId,
      type: "requirement.deleted",
      description: `Requirement removed: "${requirement.requirement.slice(0, 80)}"`,
    });
  });

  revalidatePath(`/projects/${requirement.projectId}/requirements`);
  return { message: "Requirement deleted" };
}

export async function approveRequirementsAction(
  projectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const project = await requireProjectAccess(projectId, workspaceId);
  if (!project) return { error: "Project not found" };

  // Only currently-Approved requirements go into the snapshot — this is what
  // makes a RequirementVersion mean "the approved scope at this point,"
  // which proposal/quotation generation can then read as-is with no further
  // filtering.
  const requirements = await db.requirement.findMany({
    where: { projectId, status: "APPROVED" },
    orderBy: { createdAt: "asc" },
  });
  if (requirements.length === 0) {
    return { error: "Mark at least one requirement Approved before locking scope." };
  }

  const changesSummary = String(formData.get("changesSummary") ?? "").trim() || undefined;

  const newSnapshot = requirements.map((r) => ({
    id: r.id,
    category: r.category,
    requirement: r.requirement,
    status: r.status,
    priority: r.priority,
    confidence: r.confidence,
    evidence: r.evidence,
    notes: r.notes,
  }));

  const lastVersion = await db.requirementVersion.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });

  // Order-insensitive at two levels: array position (a requirement's spot
  // in `requirements` can shift between locks, e.g. delete + re-add, without
  // its content actually changing) AND object key order (Postgres jsonb
  // doesn't preserve the key order it was written with, so a freshly built
  // object never round-trips with the same JSON.stringify output as one
  // read back from the DB, even when every field matches).
  function canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value
        .map(canonicalize)
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, canonicalize(v)])
      );
    }
    return value;
  }
  const stableStringify = (items: unknown[]) => JSON.stringify(canonicalize(items));

  if (
    lastVersion &&
    stableStringify(newSnapshot) === stableStringify(lastVersion.snapshot as typeof newSnapshot)
  ) {
    return { message: `No changes since version ${lastVersion.version} — nothing to lock.` };
  }

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  await db.$transaction(async (tx) => {
    await tx.requirementVersion.create({
      data: {
        projectId,
        version: nextVersion,
        changesSummary,
        snapshot: newSnapshot,
      },
    });
    await logActivity(tx, {
      workspaceId,
      leadId: project.leadId,
      projectId,
      type: "requirements.approved",
      description: `Requirements approved (v${nextVersion}, ${requirements.length} items)`,
    });
  });

  revalidatePath(`/projects/${projectId}/requirements`);
  return { message: `Scope locked as version ${nextVersion}` };
}
