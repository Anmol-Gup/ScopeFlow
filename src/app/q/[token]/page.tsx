import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuotationActions } from "@/components/public-quotation/quotation-actions";
import { DocumentBrandingHeader, DocumentBrandingFooter } from "@/components/branding/document-branding";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { formatCurrency, formatDate, formatQuotationNumber } from "@/lib/format";
import { resolveAccentColor, resolveTermsAndConditions, resolveCurrency } from "@/lib/branding";

export default async function PublicQuotationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const share = await db.quotationShare.findUnique({
    where: { token },
    include: {
      quotation: {
        include: {
          project: { include: { lead: true, workspace: { select: { id: true, name: true, branding: true } } } },
          versions: { orderBy: { version: "desc" }, take: 1, include: { items: true } },
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
    // Mirrors onto Quotation.status too — see the identical comment in
    // p/[token]/page.tsx. Only fires on the actual SENT->VIEWED transition.
    const becameViewed = share.status === "SENT";
    await db.$transaction(async (tx) => {
      await tx.quotationShare.update({
        where: { id: share.id },
        data: {
          firstViewedAt: share.firstViewedAt ?? now,
          lastViewedAt: now,
          viewCount: { increment: 1 },
          status: becameViewed ? "VIEWED" : share.status,
        },
      });
      if (becameViewed) {
        await tx.quotation.update({ where: { id: share.quotationId }, data: { status: "VIEWED" } });
      }
    });
    if (isFirstView) {
      await logActivity(db, {
        workspaceId: share.quotation.project.workspaceId,
        leadId: share.quotation.project.leadId,
        projectId: share.quotation.projectId,
        type: "quotation.viewed",
        description: "Client viewed the quotation",
      });
    }
  }

  const version = share.quotation.versions[0];
  const project = share.quotation.project;
  const lead = project.lead;
  const branding = project.workspace.branding;
  const accentColor = resolveAccentColor(share.quotation, branding);
  const termsAndConditions = resolveTermsAndConditions(share.quotation, branding);
  const currency = resolveCurrency(branding);
  const paymentTerms = version?.paymentTerms || branding?.paymentTerms || null;

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
          <h1 className="text-2xl font-semibold tracking-tight">Quotation — {project.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatQuotationNumber(share.quotation)} · {formatDate(share.quotation.createdAt)}
          </p>
          <p className="text-sm text-muted-foreground">
            Prepared for {lead.name}
            {lead.company ? ` (${lead.company})` : ""}
          </p>
        </div>
        {!isExpired && version && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a href={`/q/${token}/pdf`}>
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
              This quotation link has expired. Please contact {project.workspace.name} for an
              updated link.
            </p>
          </CardContent>
        </Card>
      ) : !version ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">This quotation isn&apos;t ready yet.</p>
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
                    ? "You've already accepted this quotation. Thank you!"
                    : "This quotation was marked as rejected."}
                </p>
              </CardContent>
            </Card>
          )}

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
                    {version.items.map((item) => (
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
                  <span>{formatCurrency(version.subtotal.toString(), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatCurrency(version.discountAmount.toString(), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(version.taxAmount.toString(), currency)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Grand total</span>
                  <span>{formatCurrency(version.total.toString(), currency)}</span>
                </div>
              </div>
              {paymentTerms && (
                <p className="text-sm whitespace-pre-wrap">
                  <span className="font-medium">Payment terms: </span>
                  {paymentTerms}
                </p>
              )}
            </CardContent>
          </Card>

          <DocumentBrandingFooter branding={branding} termsAndConditions={termsAndConditions} />

          {!isTerminal && <QuotationActions token={token} />}

          <p className="text-center text-xs text-muted-foreground">
            Valid until {share.expiresAt ? formatDate(share.expiresAt) : "further notice"}.
          </p>
        </>
      )}
    </div>
  );
}
