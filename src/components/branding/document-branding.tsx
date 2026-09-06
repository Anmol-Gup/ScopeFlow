import type { WorkspaceBrandingData } from "@/lib/branding";
import { brandingLogoUrl } from "@/lib/branding";

// The professional header/footer wrapped around a generated document
// (public proposal/quotation pages, and the agency-side preview of the
// same). Purely presentational — the AI-generated document content is
// passed through unchanged as children.

export function DocumentBrandingHeader({
  workspaceId,
  workspaceName,
  branding,
  accentColor,
}: {
  workspaceId: string;
  workspaceName: string;
  branding: WorkspaceBrandingData;
  accentColor: string;
}) {
  const logoUrl = brandingLogoUrl(workspaceId, branding);
  const contactLine = [branding?.companyEmail, branding?.companyPhone, branding?.companyWebsite]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5" style={{ borderTopWidth: 4, borderTopColor: accentColor }}>
      <div className="flex items-center gap-4">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`${branding?.companyName ?? workspaceName} logo`} className="h-12 w-auto max-w-40 object-contain" />
        )}
        <div className="flex flex-col gap-0.5">
          <p className="text-lg font-semibold tracking-tight">{branding?.companyName || workspaceName}</p>
          {contactLine && <p className="text-xs text-muted-foreground">{contactLine}</p>}
          {branding?.address && <p className="text-xs text-muted-foreground">{branding.address}</p>}
        </div>
      </div>
    </div>
  );
}

export function DocumentBrandingFooter({
  branding,
  termsAndConditions,
}: {
  branding: WorkspaceBrandingData;
  termsAndConditions: string | null;
}) {
  if (!termsAndConditions && !branding?.taxId) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-5 text-xs text-muted-foreground">
      {branding?.taxId && <p>GST/Tax registration: {branding.taxId}</p>}
      {termsAndConditions && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">Terms &amp; Conditions</p>
          <p className="whitespace-pre-wrap">{termsAndConditions}</p>
        </div>
      )}
    </div>
  );
}
