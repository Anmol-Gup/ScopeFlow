import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/dashboard/back-link";
import { AddClientInformationDialog } from "@/components/requirements/add-client-information-dialog";
import { GenerateAdditionalProposalForm } from "@/components/proposals/generate-additional-proposal-form";
import { CreateAdditionalQuotationForm } from "@/components/quotations/create-additional-quotation-form";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { projectStatusLabel, projectStatusBadgeVariant } from "@/lib/projects/constants";
import { documentStatusLabel, documentStatusBadgeVariant } from "@/lib/documents/constants";
import { QuotationStatusBadge } from "@/components/quotations/quotation-status-badge";
import { computeAdditionalScopeDelta } from "@/lib/requirements/scope";
import { computeProjectCommercialValue } from "@/lib/projects/commercial-value";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { workspaceId } = await requireWorkspaceAccess();

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    include: {
      lead: { select: { id: true, name: true, company: true, email: true } },
    },
  });
  if (!project) notFound();

  const [
    requirementCount,
    pendingApprovalCount,
    approvedCount,
    latestRequirementVersion,
    proposal,
    quotation,
    latestChangeRequest,
    providerCredentials,
    additionalProposals,
    additionalScope,
    commercialValue,
  ] = await Promise.all([
    db.requirement.count({ where: { projectId } }),
    db.requirement.count({ where: { projectId, status: "PENDING_APPROVAL" } }),
    db.requirement.count({ where: { projectId, status: "APPROVED" } }),
    db.requirementVersion.findFirst({ where: { projectId }, orderBy: { version: "desc" } }),
    db.proposal.findFirst({
      where: { projectId, kind: "ORIGINAL" },
      select: { id: true, status: true, currentVersion: true },
    }),
    db.quotation.findFirst({
      // A superseded ORIGINAL quotation's replacement (same kind, later
      // createdAt) is always the one that represents the project's active
      // commercial state.
      where: { projectId, kind: "ORIGINAL", status: { not: "SUPERSEDED" } },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        currentVersion: true,
        versions: { orderBy: { version: "desc" }, take: 1, select: { total: true } },
      },
    }),
    db.proposalChangeRequest.findFirst({
      where: { projectId, proposal: { kind: "ORIGINAL" } },
      orderBy: { createdAt: "desc" },
    }),
    db.aIProviderCredential.findMany({
      where: { workspaceId, isActive: true },
      select: { provider: true, model: true },
    }),
    db.proposal.findMany({
      where: { projectId, kind: "ADDITIONAL" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        status: true,
        currentVersion: true,
        quotations: {
          select: { id: true, status: true, currentVersion: true },
        },
      },
    }),
    computeAdditionalScopeDelta(projectId),
    computeProjectCommercialValue(projectId),
  ]);

  const hasApprovedRequirements = Boolean(latestRequirementVersion);
  const proposalAccepted = proposal?.status === "ACCEPTED";
  const originalQuotationAccepted = quotation?.status === "ACCEPTED";

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={`/leads/${project.lead.id}`} label={project.lead.name} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/leads/${project.lead.id}`} className="underline underline-offset-4">
              {project.lead.name}
            </Link>
            {project.lead.company ? ` · ${project.lead.company}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={projectStatusBadgeVariant(project.status)}>
            {projectStatusLabel(project.status)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/projects/${project.id}/edit`}>
                <Pencil />
                Edit
              </Link>
            }
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p>{project.budget ? formatCurrency(project.budget.toString()) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Timeline</p>
              <p>{project.timeline || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p>{formatDate(project.createdAt)}</p>
            </div>
            {commercialValue > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Commercial value (accepted)</p>
                <p className="font-medium">{formatCurrency(commercialValue)}</p>
              </div>
            )}
          </div>
          {project.overview && <p className="whitespace-pre-wrap text-sm">{project.overview}</p>}
        </CardContent>
      </Card>

      {additionalScope.eligible && additionalScope.deltaRequirements.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-warning">Needs Review</p>
            <p className="text-sm text-muted-foreground">
              {additionalScope.deltaRequirements.length} newly-approved requirement
              {additionalScope.deltaRequirements.length === 1 ? "" : "s"} ready for an additional
              proposal — the original scope stays locked.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <CardTitle>Requirements</CardTitle>
          <div className="flex items-center gap-2">
            <AddClientInformationDialog
              projectId={projectId}
              hasAiProvider={providerCredentials.length > 0}
              trigger={{ content: "Add Information", size: "sm" }}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {requirementCount === 0 ? (
            <>
              <p className="text-sm font-medium">No requirements yet.</p>
              <p className="text-sm text-muted-foreground">
                Add requirements from a client conversation or project brief.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {requirementCount} requirement{requirementCount === 1 ? "" : "s"} · {approvedCount}{" "}
              approved · {pendingApprovalCount} pending approval
            </p>
          )}
          <div>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/projects/${projectId}/requirements`}>Edit Requirements</Link>}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <CardTitle>Proposal</CardTitle>
          <Button
            variant={!proposal && hasApprovedRequirements ? "default" : "outline"}
            size="sm"
            nativeButton={false}
            render={
              <Link href={hasApprovedRequirements || proposal ? `/projects/${projectId}/proposal` : `/projects/${projectId}/requirements`}>
                {proposal ? "Open Proposal" : hasApprovedRequirements ? "Generate Proposal" : "View Requirements"}
              </Link>
            }
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!proposal ? (
            <p className="text-sm text-muted-foreground">
              {hasApprovedRequirements
                ? "Generate a proposal from your approved requirements."
                : "Generate a proposal from your approved requirements. Requires approved requirements."}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Version {proposal.currentVersion}</span>
              <Badge variant={documentStatusBadgeVariant(proposal.status)}>
                {documentStatusLabel(proposal.status)}
              </Badge>
            </div>
          )}
          {latestChangeRequest && !latestChangeRequest.resolvedAt && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-warning">Changes requested</p>
                <p className="text-sm whitespace-pre-wrap">{latestChangeRequest.message}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(latestChangeRequest.createdAt)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <CardTitle>Quotation</CardTitle>
          <Button
            variant={!quotation && proposalAccepted ? "default" : "outline"}
            size="sm"
            nativeButton={false}
            render={
              <Link href={proposalAccepted || quotation ? `/projects/${projectId}/quotation` : `/projects/${projectId}/proposal`}>
                {quotation ? "Open Quotation" : proposalAccepted ? "Create Quotation" : "View Proposal"}
              </Link>
            }
          />
        </CardHeader>
        <CardContent>
          {!quotation ? (
            <p className="text-sm text-muted-foreground">
              {proposalAccepted
                ? "Create a quotation from your accepted proposal."
                : "Not created. Requires the proposal to be accepted by the client first."}
            </p>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Version {quotation.currentVersion}
                {quotation.versions[0] && ` · ${formatCurrency(quotation.versions[0].total.toString())}`}
              </span>
              <QuotationStatusBadge status={quotation.status} />
            </div>
          )}
        </CardContent>
      </Card>

      {originalQuotationAccepted && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Scope</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              The original scope is locked. New approved requirements are priced separately here,
              without touching the original proposal or quotation.
            </p>

            {additionalProposals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No additional-scope documents yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {additionalProposals.map((additional, index) => {
                  const additionalQuotation = additional.quotations[0];
                  // An additional-scope quotation from an earlier round that
                  // hasn't been decided yet absorbs pricing for further
                  // accepted Additional proposals too, instead of a second,
                  // disconnected quotation being created alongside it — same
                  // "one live document per scope round" rule
                  // generateAdditionalProposalAction already follows. Only
                  // relevant once THIS proposal is itself Accepted — an
                  // unaccepted one has no business being linked to pricing at
                  // all yet, regardless of what's open elsewhere.
                  const sharedOpenQuotation =
                    !additionalQuotation && additional.status === "ACCEPTED"
                      ? additionalProposals
                          .flatMap((p) => p.quotations)
                          .find((q) => q.status !== "ACCEPTED" && q.status !== "REJECTED")
                      : undefined;
                  return (
                    <div
                      key={additional.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                    >
                      <span className="font-medium">Additional Scope #{index + 1}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/projects/${projectId}/proposal?id=${additional.id}`}
                          className="flex items-center gap-1.5 underline underline-offset-4"
                        >
                          Proposal
                          <Badge variant={documentStatusBadgeVariant(additional.status)}>
                            {documentStatusLabel(additional.status)}
                          </Badge>
                        </Link>
                        {additionalQuotation ? (
                          <Link
                            href={`/projects/${projectId}/quotation?id=${additionalQuotation.id}`}
                            className="flex items-center gap-1.5 underline underline-offset-4"
                          >
                            Quotation
                            <QuotationStatusBadge status={additionalQuotation.status} />
                          </Link>
                        ) : sharedOpenQuotation ? (
                          <Link
                            href={`/projects/${projectId}/quotation?id=${sharedOpenQuotation.id}`}
                            className="flex items-center gap-1.5 underline underline-offset-4"
                          >
                            Add pricing to open quotation
                            <QuotationStatusBadge status={sharedOpenQuotation.status} />
                          </Link>
                        ) : additional.status === "ACCEPTED" ? (
                          <CreateAdditionalQuotationForm projectId={projectId} proposalId={additional.id} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Awaiting client acceptance
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {additionalScope.deltaRequirements.length > 0 ? (
              providerCredentials.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No AI provider is configured yet.{" "}
                  <Link href="/settings/ai-providers" className="underline underline-offset-4">
                    Add one in Settings
                  </Link>{" "}
                  to generate an additional-scope proposal.
                </p>
              ) : (
                <GenerateAdditionalProposalForm projectId={projectId} />
              )
            ) : (
              <p className="text-xs text-muted-foreground">
                <Sparkles className="mr-1 inline size-3" />
                Approve a new requirement to enable an additional-scope proposal.
              </p>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
