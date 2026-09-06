"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";
import {
  isAllowedLogoType,
  saveWorkspaceBrandingLogo,
  deleteWorkspaceBrandingLogo,
  MAX_LOGO_SIZE_BYTES,
} from "@/lib/storage";

export type ActionState = { error?: string; message?: string } | undefined;

const optionalString = z
  .string()
  .nullish()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed && trimmed.length ? trimmed : undefined;
  });

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD"] as const;

const brandingSchema = z.object({
  companyName: optionalString,
  companyEmail: z
    .string()
    .nullish()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed && trimmed.length ? trimmed : undefined;
    })
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
      message: "Enter a valid company email",
    }),
  companyPhone: optionalString,
  companyWebsite: optionalString,
  address: optionalString,
  taxId: optionalString,
  currency: z.enum(CURRENCIES),
  accentColor: z
    .string()
    .nullish()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed && trimmed.length ? trimmed : undefined;
    })
    .refine((v) => v === undefined || /^#[0-9a-fA-F]{6}$/.test(v), {
      message: "Accent color must be a hex value like #166534",
    }),
  paymentTerms: optionalString,
  termsAndConditions: optionalString,
});

export async function saveBrandingAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const parsed = brandingSchema.safeParse({
    companyName: formData.get("companyName"),
    companyEmail: formData.get("companyEmail"),
    companyPhone: formData.get("companyPhone"),
    companyWebsite: formData.get("companyWebsite"),
    address: formData.get("address"),
    taxId: formData.get("taxId"),
    currency: formData.get("currency"),
    accentColor: formData.get("accentColor"),
    paymentTerms: formData.get("paymentTerms"),
    termsAndConditions: formData.get("termsAndConditions"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const logoFile = formData.get("logo");
  let logoUpdate: { logoFilename: string; logoMimeType: string } | undefined;
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!isAllowedLogoType(logoFile.type)) {
      return { error: "Unsupported image type. Upload a PNG, JPEG, WEBP, or SVG file." };
    }
    if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
      return { error: "Logo is too large (max 2MB)." };
    }
    const existing = await db.workspaceBranding.findUnique({ where: { workspaceId } });
    if (existing?.logoFilename) {
      await deleteWorkspaceBrandingLogo(workspaceId, existing.logoFilename);
    }
    const { storedFilename } = await saveWorkspaceBrandingLogo(workspaceId, logoFile);
    logoUpdate = { logoFilename: storedFilename, logoMimeType: logoFile.type };
  }

  await db.workspaceBranding.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      companyName: data.companyName,
      companyEmail: data.companyEmail,
      companyPhone: data.companyPhone,
      companyWebsite: data.companyWebsite,
      address: data.address,
      taxId: data.taxId,
      currency: data.currency,
      accentColor: data.accentColor,
      paymentTerms: data.paymentTerms,
      termsAndConditions: data.termsAndConditions,
      ...logoUpdate,
    },
    update: {
      companyName: data.companyName,
      companyEmail: data.companyEmail,
      companyPhone: data.companyPhone,
      companyWebsite: data.companyWebsite,
      address: data.address,
      taxId: data.taxId,
      currency: data.currency,
      accentColor: data.accentColor,
      paymentTerms: data.paymentTerms,
      termsAndConditions: data.termsAndConditions,
      ...logoUpdate,
    },
  });

  revalidatePath("/settings/branding");
  return { message: "Branding saved" };
}

export async function removeBrandingLogoAction(): Promise<ActionState> {
  const { workspaceId } = await requireWorkspaceAccess();

  const existing = await db.workspaceBranding.findUnique({ where: { workspaceId } });
  if (!existing?.logoFilename) return { message: "No logo to remove" };

  await deleteWorkspaceBrandingLogo(workspaceId, existing.logoFilename);
  await db.workspaceBranding.update({
    where: { workspaceId },
    data: { logoFilename: null, logoMimeType: null },
  });

  revalidatePath("/settings/branding");
  return { message: "Logo removed" };
}
