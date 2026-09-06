import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import { formatDate, formatQuotationNumber } from "@/lib/format";
import { QuotationPdfDocument } from "@/lib/pdf/quotation-pdf";
import { resolveAccentColor, resolveTermsAndConditions, resolveCurrency } from "@/lib/branding";
import { readWorkspaceBrandingLogo } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quotationId: string }> }
) {
  const { quotationId } = await params;
  const { workspaceId, workspace } = await requireWorkspaceAccess();

  const quotation = await db.quotation.findFirst({
    where: { id: quotationId, project: { workspaceId } },
    include: {
      project: { include: { lead: true } },
      versions: { orderBy: { version: "desc" }, take: 1, include: { items: true } },
    },
  });

  if (!quotation || !quotation.versions[0]) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  const branding = await db.workspaceBranding.findUnique({ where: { workspaceId } });
  const version = quotation.versions[0];
  const lead = quotation.project.lead;
  const currency = resolveCurrency(branding);

  // Same rationale as the proposal PDF route — react-pdf needs an inline
  // data URI, not an HTTP URL, so the logo is read straight off disk.
  let logoDataUri: string | null = null;
  if (branding?.logoFilename && branding.logoMimeType && branding.logoMimeType !== "image/svg+xml") {
    try {
      const buffer = await readWorkspaceBrandingLogo(workspaceId, branding.logoFilename);
      logoDataUri = `data:${branding.logoMimeType};base64,${buffer.toString("base64")}`;
    } catch {
      logoDataUri = null;
    }
  }

  const buffer = await renderToBuffer(
    <QuotationPdfDocument
      quotationNumber={formatQuotationNumber(quotation)}
      clientName={lead.name}
      company={lead.company}
      email={lead.email}
      phone={lead.phone}
      preparedBy={workspace.name}
      generatedAt={formatDate(new Date())}
      items={version.items
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          discountPercent: item.discountPercent.toString(),
          lineTotal: item.lineTotal.toString(),
        }))}
      subtotal={version.subtotal.toString()}
      discountPercent={version.discountPercent.toString()}
      discountAmount={version.discountAmount.toString()}
      taxRate={version.taxRate.toString()}
      taxAmount={version.taxAmount.toString()}
      total={version.total.toString()}
      paymentTerms={version.paymentTerms}
      currency={currency}
      branding={
        branding
          ? {
              logoDataUri,
              companyName: branding.companyName,
              companyEmail: branding.companyEmail,
              companyPhone: branding.companyPhone,
              companyWebsite: branding.companyWebsite,
              address: branding.address,
              taxId: branding.taxId,
            }
          : null
      }
      accentColor={resolveAccentColor(quotation, branding)}
      termsAndConditions={resolveTermsAndConditions(quotation, branding)}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quotation-${lead.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf"`,
    },
  });
}
