import { BrandingSettings } from "@/components/settings/branding-settings";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";

export default async function BrandingSettingsPage() {
  const { workspaceId, workspace } = await requireWorkspaceAccess();
  const branding = await db.workspaceBranding.findUnique({ where: { workspaceId } });

  return (
    <BrandingSettings
      workspaceId={workspaceId}
      workspaceName={workspace.name}
      branding={
        branding
          ? {
              companyName: branding.companyName,
              companyEmail: branding.companyEmail,
              companyPhone: branding.companyPhone,
              companyWebsite: branding.companyWebsite,
              address: branding.address,
              taxId: branding.taxId,
              currency: branding.currency,
              accentColor: branding.accentColor,
              paymentTerms: branding.paymentTerms,
              termsAndConditions: branding.termsAndConditions,
              hasLogo: Boolean(branding.logoFilename),
            }
          : null
      }
    />
  );
}
