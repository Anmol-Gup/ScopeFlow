import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { ProposalPdfDocument } from "@/lib/pdf/proposal-pdf";
import { resolveAccentColor, resolveTermsAndConditions } from "@/lib/branding";
import { readWorkspaceBrandingLogo } from "@/lib/storage";
import type { ProposalContent } from "@/lib/ai/schemas";

// The client-facing counterpart of /api/proposals/[proposalId]/pdf — gated
// by the same token the public /p/[token] page itself uses, not by
// workspace auth, since whoever holds this link is by definition the
// intended recipient (same trust model as the page).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const share = await db.proposalShare.findUnique({
    where: { token },
    include: {
      proposal: {
        include: {
          project: {
            include: { lead: true, workspace: { select: { id: true, name: true } } },
          },
          versions: { orderBy: { version: "desc" }, take: 1, include: { requirementVersion: true } },
        },
      },
    },
  });

  if (!share || (share.expiresAt && share.expiresAt.getTime() < Date.now())) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }

  const proposal = share.proposal;
  if (!proposal.versions[0]) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const workspaceId = proposal.project.workspace.id;
  const branding = await db.workspaceBranding.findUnique({ where: { workspaceId } });
  const requirements =
    (proposal.versions[0].requirementVersion.snapshot as unknown as
      | { category: string; requirement: string; confidence: string }[]
      | undefined) ?? [];
  const content = proposal.versions[0].content as unknown as ProposalContent;
  const lead = proposal.project.lead;

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
      preparedBy={proposal.project.workspace.name}
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
