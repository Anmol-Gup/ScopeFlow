// Shared fallback-resolution logic for document branding, used by every
// rendering site (agency proposal/quotation pages, public /p and /q pages,
// the proposal PDF). Keeps the "document override -> workspace default ->
// nothing" rule in exactly one place.

export const DEFAULT_ACCENT_COLOR = "#166534";

export type WorkspaceBrandingData = {
  companyName: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyWebsite: string | null;
  address: string | null;
  taxId: string | null;
  currency: string;
  accentColor: string | null;
  paymentTerms: string | null;
  termsAndConditions: string | null;
  logoFilename: string | null;
} | null;

export type DocumentOverrides = {
  accentColor?: string | null;
  termsAndConditions?: string | null;
};

export function resolveAccentColor(document: DocumentOverrides, branding: WorkspaceBrandingData) {
  return document.accentColor || branding?.accentColor || DEFAULT_ACCENT_COLOR;
}

export function resolveTermsAndConditions(document: DocumentOverrides, branding: WorkspaceBrandingData) {
  return document.termsAndConditions || branding?.termsAndConditions || null;
}

export function resolveCurrency(branding: WorkspaceBrandingData) {
  return branding?.currency || "INR";
}

export function brandingLogoUrl(workspaceId: string, branding: WorkspaceBrandingData) {
  if (!branding?.logoFilename) return null;
  return `/api/branding/${workspaceId}/logo`;
}
