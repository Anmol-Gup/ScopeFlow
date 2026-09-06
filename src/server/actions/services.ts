"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";

export type ActionState = { error?: string; message?: string } | undefined;

const optionalString = z
  .string()
  .nullish()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed && trimmed.length ? trimmed : undefined;
  });

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: optionalString,
  defaultPrice: z
    .string()
    .trim()
    .refine((v) => v.length > 0 && !Number.isNaN(Number(v)) && Number(v) >= 0, {
      message: "Enter a valid non-negative price",
    }),
  unit: optionalString,
});

export async function createServiceAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    defaultPrice: formData.get("defaultPrice"),
    unit: formData.get("unit"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.service.create({
    data: {
      workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      defaultPrice: parsed.data.defaultPrice,
      unit: parsed.data.unit,
    },
  });

  revalidatePath("/settings");
  return { message: "Service added" };
}

export async function updateServiceAction(
  serviceId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();
  const existing = await db.service.findFirst({ where: { id: serviceId, workspaceId } });
  if (!existing) return { error: "Service not found" };

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    defaultPrice: formData.get("defaultPrice"),
    unit: formData.get("unit"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.service.update({
    where: { id: serviceId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      defaultPrice: parsed.data.defaultPrice,
      unit: parsed.data.unit,
    },
  });

  revalidatePath("/settings");
  return { message: "Service updated" };
}

export async function deleteServiceAction(formData: FormData): Promise<void> {
  const { workspaceId } = await requireWorkspaceAccess();
  const serviceId = String(formData.get("serviceId") ?? "");

  await db.service.deleteMany({ where: { id: serviceId, workspaceId } });
  revalidatePath("/settings");
}
