import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { ProposalPdfDocument } from "@/lib/pdf/proposal-pdf";
import { resolveAccentColor, resolveTermsAndConditions } from "@/lib/branding";
import { readWorkspaceBrandingLogo } from "@/lib/storage";
import type { ProposalContent } from "@/lib/ai/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const { proposalId } = await params;
  const { workspaceId, workspace } = await requireWorkspaceAccess();

  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, project: { workspaceId } },
    include: {
      project: { include: { lead: true } },
      versions: { orderBy: { version: "desc" }, take: 1, include: { requirementVersion: true } },
    },
  });

  if (!proposal || !proposal.versions[0]) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const branding = await db.workspaceBranding.findUnique({ where: { workspaceId } });
  // The exact snapshot this proposal version was generated from — never the
  // project's current requirements, which could belong to a later,
  // unrelated additional-scope round by the time this PDF is downloaded.
  const requirements =
    (proposal.versions[0].requirementVersion.snapshot as unknown as
      | { category: string; requirement: string; confidence: string }[]
      | undefined) ?? [];

  const content = proposal.versions[0].content as unknown as ProposalContent;
  const lead = proposal.project.lead;

  // react-pdf needs an inline data URI, not an HTTP URL, so the logo is read
  // straight off disk here rather than round-tripping through the public
  // /api/branding/.../logo route. SVG is excluded — react-pdf's <Image>
  // only rasterizes PNG/JPEG/WEBP, so an SVG logo still displays fine on
  // the HTML preview/public pages but is simply omitted from the PDF.
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
    <ProposalPdfDocument
      content={content}
      clientName={lead.name}
      company={lead.company}
      email={lead.email}
      phone={lead.phone}
      preparedBy={workspace.name}
      generatedAt={formatDate(new Date())}
      requirements={requirements}
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
      accentColor={resolveAccentColor(proposal, branding)}
      termsAndConditions={resolveTermsAndConditions(proposal, branding)}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposal-${lead.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf"`,
    },
  });
}
