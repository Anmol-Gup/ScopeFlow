import { notFound } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BackLink } from "@/components/dashboard/back-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { QuotationItemsEditor } from "@/components/quotations/quotation-items-editor";
import { SuggestNegotiationForm } from "@/components/quotations/suggest-negotiation-form";
import { CreateQuotationForm } from "@/components/quotations/create-quotation-form";
import { ShareQuotationPanel } from "@/components/quotations/share-quotation-panel";
import { DocumentBrandingHeader, DocumentBrandingFooter } from "@/components/branding/document-branding";
import { DocumentBrandingOverrideForm } from "@/components/branding/document-branding-override-form";
import { updateQuotationBrandingAction } from "@/server/actions/quotations";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import { formatCurrency, formatDateTime, formatQuotationNumber } from "@/lib/format";
import { documentKindLabel } from "@/lib/documents/constants";
import { QuotationStatusBadge } from "@/components/quotations/quotation-status-badge";
import { resolveAccentColor, resolveTermsAndConditions, resolveCurrency } from "@/lib/branding";

export default async function QuotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { projectId } = await params;
  const { id: quotationId } = await searchParams;
  const { workspaceId } = await requireWorkspaceAccess();

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    include: { lead: true, workspace: { select: { id: true, name: true, branding: true } } },
  });
  if (!project) notFound();

  const quotationInclude = {
    versions: { orderBy: { version: "desc" as const }, include: { items: true } },
    proposal: { select: { status: true, kind: true } },
  };

  const [latestRequirementVersion, originalProposal, quotation, services, providerCredentials] =
    await Promise.all([
      db.requirementVersion.findFirst({ where: { projectId }, orderBy: { version: "desc" } }),
      db.proposal.findFirst({ where: { projectId, kind: "ORIGINAL" }, select: { status: true } }),
      quotationId
        ? db.quotation.findFirst({ where: { id: quotationId, projectId }, include: quotationInclude })
        : db.quotation.findFirst({
            // A superseded ORIGINAL quotation must never be what "no ?id=
            // means show the current one" resolves to — its replacement
            // (same kind, later createdAt) is the active document.
            where: { projectId, kind: "ORIGINAL", status: { not: "SUPERSEDED" } },
            orderBy: { createdAt: "desc" },
            include: quotationInclude,
          }),
      db.service.findMany({ where: { workspaceId, isActive: true }, orderBy: { name: "asc" } }),
      db.aIProviderCredential.findMany({
        where: { workspaceId, isActive: true },
        select: { provider: true, model: true },
      }),
    ]);

  const latestVersion = quotation?.versions[0];
  const proposalAccepted = originalProposal?.status === "ACCEPTED";
  const share = quotation ? await db.quotationShare.findFirst({ where: { quotationId: quotation.id } }) : null;
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const branding = project.workspace.branding;
  const currency = resolveCurrency(branding);
  const accentColor = quotation ? resolveAccentColor(quotation, branding) : null;
  const termsAndConditions = quotation ? resolveTermsAndConditions(quotation, branding) : null;

  // Accepted is a full, permanent lock — same rule as proposals. Rejected
  // stays resendable once content actually changes since the rejection.
  const isAccepted = quotation?.status === "ACCEPTED";
  const canResend = Boolean(
    share &&
      share.status === "REJECTED" &&
      share.respondedAt &&
      latestVersion &&
      latestVersion.updatedAt > share.respondedAt
  );

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={`/projects/${projectId}`} label={project.name} />
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Quotation"
          description="Every price here is editable — nothing is calculated by AI."
        />
        {quotation && latestVersion && (
          <div className="flex items-center gap-2">
            {quotation.kind === "ADDITIONAL" && <Badge variant="outline">{documentKindLabel(quotation.kind)}</Badge>}
            <QuotationStatusBadge status={quotation.status} />
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a href={`/api/quotations/${quotation.id}/pdf`}>
                  <Download />
                  Download PDF
                </a>
              }
            />
          </div>
        )}
      </div>

      {!quotation ? (
        <Card>
          {(!latestRequirementVersion || !proposalAccepted) && (
            <CardHeader>
              <CardTitle>Quotation</CardTitle>
              <CardDescription>
                {!latestRequirementVersion
                  ? "Create a quotation from your approved project scope. Requires approved requirements."
                  : "A quotation can only be created once the client has accepted the proposal."}
              </CardDescription>
            </CardHeader>
          )}
          <CardContent className="flex flex-col gap-3">
            {!latestRequirementVersion ? (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                nativeButton={false}
                render={<Link href={`/projects/${projectId}/requirements`}>View Requirements</Link>}
              />
            ) : !proposalAccepted ? (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                nativeButton={false}
                render={<Link href={`/projects/${projectId}/proposal`}>View Proposal</Link>}
              />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  No quotation yet. Create one to start pricing the work — every price is editable
                  from the start.
                </p>
                <CreateQuotationForm projectId={projectId} />
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        latestVersion && (
          <>
            {accentColor && (
              <DocumentBrandingHeader
                workspaceId={project.workspace.id}
                workspaceName={project.workspace.name}
                branding={branding}
                accentColor={accentColor}
              />
            )}

            <p className="text-xs text-muted-foreground">
              {formatQuotationNumber(quotation)} · Editing version {latestVersion.version} · last saved{" "}
              {formatDateTime(latestVersion.createdAt)}
            </p>
            {share?.status === "REJECTED" && (
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
                <p className="text-xs text-warning">
                  The client rejected version {latestVersion.version} — saving will create version{" "}
                  {latestVersion.version + 1} and keep this one on record, ready to resend for a new
                  decision.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {share.rejectionReason ? (
                    <>
                      <span className="font-medium">Client said: </span>
                      {share.rejectionReason}
                    </>
                  ) : (
                    "The client didn't give a reason."
                  )}
                </p>
              </div>
            )}
            {isAccepted ? (
              <Card>
                <CardHeader>
                  <CardTitle>Line items</CardTitle>
                  <CardDescription>
                    The client has accepted this quotation — its content is locked.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {latestVersion.items
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty {item.quantity.toString()} ×{" "}
                            {formatCurrency(item.unitPrice.toString(), currency)}
                            {Number(item.discountPercent) > 0 && ` · ${item.discountPercent}% off`}
                          </p>
                        </div>
                        <span className="font-medium">
                          {formatCurrency(item.lineTotal.toString(), currency)}
                        </span>
                      </div>
                    ))}
                  <Separator />
                  <div className="flex flex-col gap-1 self-end text-sm sm:w-64">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(latestVersion.subtotal.toString(), currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Discount ({latestVersion.discountPercent.toString()}%)
                      </span>
                      <span>-{formatCurrency(latestVersion.discountAmount.toString(), currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(latestVersion.taxAmount.toString(), currency)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold">
                      <span>Grand total</span>
                      <span>{formatCurrency(latestVersion.total.toString(), currency)}</span>
                    </div>
                  </div>
                  {latestVersion.paymentTerms && (
                    <p className="text-sm">
                      <span className="font-medium">Payment terms: </span>
                      {latestVersion.paymentTerms}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <QuotationItemsEditor
                quotationId={quotation.id}
                initialItems={latestVersion.items
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => ({
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    discountPercent: Number(item.discountPercent),
                    serviceId: item.serviceId,
                  }))}
                initialDiscountPercent={Number(latestVersion.discountPercent)}
                initialTaxRate={Number(latestVersion.taxRate)}
                initialPaymentTerms={latestVersion.paymentTerms ?? ""}
                services={services.map((s) => ({
                  id: s.id,
                  name: s.name,
                  defaultPrice: s.defaultPrice.toString(),
                  unit: s.unit,
                }))}
                currency={currency}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle>Share with client</CardTitle>
              </CardHeader>
              <CardContent>
                <ShareQuotationPanel
                  quotationId={quotation.id}
                  share={share}
                  baseUrl={baseUrl}
                  canResend={canResend}
                />
              </CardContent>
            </Card>

            {!isAccepted && (
              <Card>
                <CardHeader>
                  <CardTitle>Negotiation help</CardTitle>
                </CardHeader>
                <CardContent>
                  {providerCredentials.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No AI provider is configured yet.{" "}
                      <Link href="/settings/ai-providers" className="underline underline-offset-4">
                        Add one in Settings
                      </Link>{" "}
                      to get negotiation suggestions.
                    </p>
                  ) : (
                    <SuggestNegotiationForm
                      quotationId={quotation.id}
                      defaultTargetBudget={project.lead.estimatedBudget?.toString() ?? ""}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {quotation.versions.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Version history</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {quotation.versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Badge variant="outline">v{v.version}</Badge> {formatCurrency(v.total.toString(), currency)}
                        {v.version === quotation.currentVersion ? (
                          <span className="text-xs font-medium text-foreground">Current</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Superseded</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(v.createdAt)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <DocumentBrandingFooter branding={branding} termsAndConditions={termsAndConditions} />

            {!isAccepted && (
              <Card>
                <CardHeader>
                  <CardTitle>Branding for this document</CardTitle>
                  <CardDescription>
                    Optional overrides of the workspace defaults — leave blank to use them.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentBrandingOverrideForm
                    action={updateQuotationBrandingAction.bind(null, quotation.id)}
                    defaultAccentColor={quotation.accentColor}
                    defaultTermsAndConditions={quotation.termsAndConditions}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )
      )}
    </div>
  );
}
