"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";
import {
  leadSourceLabel,
  leadStatusLabel,
} from "@/lib/leads/constants";

const DUPLICATE_EMAIL_ERROR = "A lead with this email already exists in this workspace";

function isDuplicateEmailError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  // The @prisma/adapter-pg driver adapter doesn't populate `meta.target`
  // (the usual Prisma shape) — it only gives `modelName`. Lead's only
  // unique constraint is (workspaceId, email), so a P2002 on Lead always
  // means the email collided; fall back to `target` too in case a future
  // Prisma/adapter version does populate it.
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes("email");
  return error.meta?.modelName === "Lead";
}

export type ActionState = { error?: string; message?: string } | undefined;

// `.nullish()` (not `.optional()`) because FormData.get() returns null — not
// undefined — for a field that isn't present in the submitted form at all
// (e.g. a conditionally-rendered field).
const optionalString = z
  .string()
  .nullish()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed && trimmed.length ? trimmed : undefined;
  });

const optionalDecimal = z
  .string()
  .nullish()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed && trimmed.length ? trimmed : undefined;
  })
  .refine((v) => v === undefined || !Number.isNaN(Number(v)), {
    message: "Enter a valid number",
  });

const leadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  company: optionalString,
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: optionalString,
  website: optionalString,
  source: z.enum(["WEBSITE", "EMAIL", "WHATSAPP", "LINKEDIN", "REFERRAL", "MANUAL", "OTHER"]),
  industry: optionalString,
  estimatedBudget: optionalDecimal,
  expectedTimeline: optionalString,
  ownerId: optionalString,
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  notes: optionalString,
});

async function assertValidOwner(workspaceId: string, ownerId: string | undefined) {
  if (!ownerId) return true;
  const membership = await db.workspaceMember.findFirst({ where: { workspaceId, userId: ownerId } });
  return Boolean(membership);
}

function parseLeadForm(formData: FormData) {
  return leadSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    source: formData.get("source"),
    industry: formData.get("industry"),
    estimatedBudget: formData.get("estimatedBudget"),
    expectedTimeline: formData.get("expectedTimeline"),
    ownerId: formData.get("ownerId"),
    priority: formData.get("priority"),
    notes: formData.get("notes"),
  });
}

export async function createLeadAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const parsed = parseLeadForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  if (!(await assertValidOwner(workspaceId, data.ownerId))) {
    return { error: "Selected owner is not a member of this workspace" };
  }

  let lead;
  try {
    lead = await db.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          workspaceId,
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          website: data.website,
          source: data.source,
          industry: data.industry,
          estimatedBudget: data.estimatedBudget,
          expectedTimeline: data.expectedTimeline,
          ownerId: data.ownerId,
          priority: data.priority,
          notes: data.notes,
        },
      });

      await logActivity(tx, {
        workspaceId,
        leadId: created.id,
        type: "lead.created",
        description: `Lead "${created.name}" created from ${leadSourceLabel(created.source)}`,
      });

      return created;
    });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return { error: DUPLICATE_EMAIL_ERROR };
    }
    throw error;
  }

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadAction(
  leadId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const existing = await db.lead.findFirst({ where: { id: leadId, workspaceId } });
  if (!existing) return { error: "Lead not found" };

  const parsed = parseLeadForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  if (!(await assertValidOwner(workspaceId, data.ownerId))) {
    return { error: "Selected owner is not a member of this workspace" };
  }

  try {
    await db.lead.update({
      where: { id: leadId },
      data: {
        name: data.name,
        company: data.company,
        email: data.email,
        phone: data.phone,
        website: data.website,
        source: data.source,
        industry: data.industry,
        estimatedBudget: data.estimatedBudget,
        expectedTimeline: data.expectedTimeline,
        ownerId: data.ownerId,
        priority: data.priority,
        notes: data.notes,
      },
    });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return { error: DUPLICATE_EMAIL_ERROR };
    }
    throw error;
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}`);
}

const LEAD_STATUS_VALUES = ["NEW", "CONTACTED", "ACTIVE", "WON", "LOST"] as const;

export async function updateLeadStatusAction(formData: FormData): Promise<void> {
  const { workspaceId } = await requireWorkspaceAccess();
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!LEAD_STATUS_VALUES.includes(status as (typeof LEAD_STATUS_VALUES)[number])) {
    return;
  }

  const lead = await db.lead.findFirst({ where: { id: leadId, workspaceId } });
  if (!lead) return;
  if (lead.status === status) return;

  await db.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { status: status as never } });
    await logActivity(tx, {
      workspaceId,
      leadId,
      type: "lead.status_changed",
      description: `Status changed from ${leadStatusLabel(lead.status)} to ${leadStatusLabel(
        status as never
      )}`,
    });
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}
