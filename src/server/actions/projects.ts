"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";

export type ActionState = { error?: string; message?: string } | undefined;

const optionalString = z
  .string()
  .nullish()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed && trimmed.length ? trimmed : undefined;
  });

// A Project is the scope boundary and is created FIRST, before any
// requirements/proposal/quotation exist for it — a Lead (client/company)
// can have many independent Projects. No longer gated on the lead being
// WON, and no longer seeded from an existing proposal/quotation (there
// isn't one yet at this point).
export async function createProjectAction(
  leadId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const lead = await db.lead.findFirst({ where: { id: leadId, workspaceId } });
  if (!lead) return { error: "Lead not found" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Project name is required" };

  const project = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        workspaceId,
        leadId,
        name,
        status: "SCOPING",
        // Seeded from the lead's rough intake estimate as a starting point —
        // this project's own budget/timeline (edited separately below) is
        // what every proposal/quotation for it actually uses from here on.
        budget: lead.estimatedBudget ?? undefined,
        timeline: lead.expectedTimeline ?? undefined,
      },
    });
    await logActivity(tx, {
      workspaceId,
      leadId,
      projectId: created.id,
      type: "project.created",
      description: `Project "${name}" created`,
    });
    return created;
  });

  revalidatePath(`/leads/${leadId}`);
  redirect(`/projects/${project.id}`);
}

const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  overview: optionalString,
  timeline: optionalString,
  budget: z
    .string()
    .nullish()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed && trimmed.length ? trimmed : undefined;
    })
    .refine((v) => v === undefined || !Number.isNaN(Number(v)), { message: "Enter a valid number" }),
  status: z.enum(["SCOPING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
});

export async function updateProjectAction(
  projectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const project = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) return { error: "Project not found" };

  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    overview: formData.get("overview"),
    timeline: formData.get("timeline"),
    budget: formData.get("budget"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.project.update({
    where: { id: projectId },
    data: {
      name: parsed.data.name,
      overview: parsed.data.overview,
      timeline: parsed.data.timeline,
      budget: parsed.data.budget,
      status: parsed.data.status,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

