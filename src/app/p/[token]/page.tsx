import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProposalActions } from "@/components/public-proposal/proposal-actions";
import { DocumentBrandingHeader, DocumentBrandingFooter } from "@/components/branding/document-branding";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { formatCurrency, formatDate } from "@/lib/format";
import { requirementCategoryLabel } from "@/lib/requirements/constants";
import { resolveAccentColor, resolveTermsAndConditions, resolveCurrency } from "@/lib/branding";
import type { ProposalContent } from "@/lib/ai/schemas";

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-inside list-disc text-sm">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const share = await db.proposalShare.findUnique({
    where: { token },
    include: {
      proposal: {
        include: {
          project: { include: { lead: true, workspace: { select: { id: true, name: true, branding: true } } } },
          versions: { orderBy: { version: "desc" }, take: 1, include: { requirementVersion: true } },
        },
      },
    },
  });

  if (!share) notFound();

  const now = new Date();
  const isExpired = share.expiresAt !== null && share.expiresAt.getTime() < now.getTime();
  const isTerminal = share.status === "ACCEPTED" || share.status === "REJECTED";

  if (!isExpired) {
    const isFirstView = !share.firstViewedAt;
    // Mirrors onto Proposal.status too — every other share transition
    // (sent, accepted, rejected) already updates both together; this was
    // the one exception, which is why filtering the Proposals list by
    // "Viewed" never matched anything despite the share clearly showing it.
    // Only fires on the actual SENT->VIEWED transition, never unconditionally
    // re-asserting share.status onto the proposal — a later revision could
    // have already moved proposal.status on (e.g. back to DRAFT) since this
    // share's own status was last set, and a stale re-view must not clobber
    // that.
    const becameViewed = share.status === "SENT";
    await db.$transaction(async (tx) => {
      await tx.proposalShare.update({
        where: { id: share.id },
        data: {
          firstViewedAt: share.firstViewedAt ?? now,
          lastViewedAt: now,
          viewCount: { increment: 1 },
          status: becameViewed ? "VIEWED" : share.status,
        },
      });
      if (becameViewed) {
        await tx.proposal.update({ where: { id: share.proposalId }, data: { status: "VIEWED" } });
      }
    });
    if (isFirstView) {
      await logActivity(db, {
        workspaceId: share.proposal.project.workspaceId,
        leadId: share.proposal.project.leadId,
        projectId: share.proposal.projectId,
        type: "proposal.viewed",
        description: "Client viewed the proposal",
      });
    }
  }

  const version = share.proposal.versions[0];
  const content = version?.content as unknown as ProposalContent | undefined;
  const project = share.proposal.project;
  const lead = project.lead;

  // Reads the exact snapshot THIS proposal version was generated from —
  // never the project's current/latest requirements, which could belong to
  // a later, unrelated additional-scope round by the time this link is
  // viewed.
  const requirements =
    (version?.requirementVersion?.snapshot as unknown as
      | { category: string; requirement: string; confidence: string }[]
      | undefined) ?? [];
  const groupedRequirements = ["FUNCTIONAL", "NON_FUNCTIONAL", "INTEGRATION", "CONSTRAINT"].map(
    (category) => ({
      category,
      items: requirements.filter((r) => r.category === category),
    })
  );

  // A superseded quotation and its replacement can share the same
  // proposalId (Case 2: scope changed, the old quotation was superseded and
  // a fresh one created for the same re-accepted proposal) — always show
  // the active one.
  const quotation = await db.quotation.findFirst({
    where: { proposalId: share.proposalId, status: { not: "SUPERSEDED" } },
    orderBy: { createdAt: "desc" },
    include: { versions: { orderBy: { version: "desc" }, take: 1, include: { items: true } } },
  });

  const quotationVersion = quotation?.versions[0];
  const branding = project.workspace.branding;
  const accentColor = resolveAccentColor(share.proposal, branding);
  const termsAndConditions = resolveTermsAndConditions(share.proposal, branding);
  const currency = resolveCurrency(branding);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <DocumentBrandingHeader
        workspaceId={project.workspace.id}
        workspaceName={project.workspace.name}
        branding={branding}
        accentColor={accentColor}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {content?.coverTitle ?? "Proposal"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Prepared for {lead.name}
            {lead.company ? ` (${lead.company})` : ""}
          </p>
        </div>
        {!isExpired && content && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a href={`/p/${token}/pdf`}>
                <Download />
                Download PDF
              </a>
            }
          />
        )}
      </div>

      {isExpired ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This proposal link has expired. Please contact {project.workspace.name} for an updated
              link.
            </p>
          </CardContent>
        </Card>
      ) : !content ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">This proposal isn&apos;t ready yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {isTerminal && (
            <Card>
              <CardContent>
                <Badge variant={share.status === "ACCEPTED" ? "default" : "destructive"}>
                  {share.status === "ACCEPTED" ? "Accepted" : "Rejected"}
                </Badge>
                <p className="mt-2 text-sm text-muted-foreground">
                  {share.status === "ACCEPTED"
                    ? "You've already accepted this proposal. Thank you!"
                    : "This proposal was marked as rejected."}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Executive summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{content.executiveSummary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proposed solution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{content.proposedSolution}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scope of work</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={content.scopeOfWork} />
            </CardContent>
          </Card>

          {requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>What&apos;s included</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {groupedRequirements.map(
                  (group) =>
                    group.items.length > 0 && (
                      <div key={group.category}>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          {requirementCategoryLabel(group.category)}
                        </p>
                        <ul className="list-inside list-disc text-sm">
                          {group.items.map((item, i) => (
                            <li key={i}>{item.requirement}</li>
                          ))}
                        </ul>
                      </div>
                    )
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Deliverables</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={content.deliverables} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{content.timeline}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Out of scope</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={content.outOfScope} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support &amp; warranty</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{content.supportWarranty}</p>
            </CardContent>
          </Card>

          {quotationVersion && (
            <Card>
              <CardHeader>
                <CardTitle>Quotation</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit price</TableHead>
                        <TableHead className="text-right">Line total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotationVersion.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity.toString()}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice.toString(), currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.lineTotal.toString(), currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-1 self-end text-sm sm:w-64">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(quotationVersion.subtotal.toString(), currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>-{formatCurrency(quotationVersion.discountAmount.toString(), currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(quotationVersion.taxAmount.toString(), currency)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold">
                    <span>Grand total</span>
                    <span>{formatCurrency(quotationVersion.total.toString(), currency)}</span>
                  </div>
                </div>
                {quotationVersion.paymentTerms && (
                  <p className="text-sm whitespace-pre-wrap">
                    <span className="font-medium">Payment terms: </span>
                    {quotationVersion.paymentTerms}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{content.paymentTerms}</p>
            </CardContent>
          </Card>

          <DocumentBrandingFooter branding={branding} termsAndConditions={termsAndConditions} />

          {!isTerminal && <ProposalActions token={token} />}

          <p className="text-center text-xs text-muted-foreground">
            Valid until {share.expiresAt ? formatDate(share.expiresAt) : "further notice"}.
          </p>
        </>
      )}
    </div>
  );
}
