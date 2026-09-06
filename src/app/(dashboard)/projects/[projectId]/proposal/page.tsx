import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/dashboard/back-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { GenerateProposalForm } from "@/components/proposals/generate-proposal-form";
import { ReviseProposalForm } from "@/components/proposals/revise-proposal-form";
import { ShareProposalPanel } from "@/components/proposals/share-proposal-panel";
import { FollowUpForm } from "@/components/proposals/follow-up-form";
import { DocumentBrandingHeader, DocumentBrandingFooter } from "@/components/branding/document-branding";
import { DocumentBrandingOverrideForm } from "@/components/branding/document-branding-override-form";
import { updateProposalBrandingAction } from "@/server/actions/proposals";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { requirementCategoryLabel, confidenceLabel } from "@/lib/requirements/constants";
import { documentKindLabel } from "@/lib/documents/constants";
import { resolveAccentColor, resolveTermsAndConditions } from "@/lib/branding";
import { computeAdditionalScopeDelta } from "@/lib/requirements/scope";
import type { ProposalContent } from "@/lib/ai/schemas";

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">None specified.</p>;
  return (
    <ul className="list-inside list-disc text-sm">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { projectId } = await params;
  const { id: proposalId } = await searchParams;
  const { workspaceId } = await requireWorkspaceAccess();

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    include: { lead: true, workspace: { select: { id: true, name: true, branding: true } } },
  });
  if (!project) notFound();

  const proposalInclude = {
    versions: { orderBy: { version: "desc" as const }, include: { requirementVersion: true } },
  };

  const [latestRequirementVersion, proposal, providerCredentials, additionalScopeDelta] = await Promise.all([
    db.requirementVersion.findFirst({ where: { projectId }, orderBy: { version: "desc" } }),
    proposalId
      ? db.proposal.findFirst({ where: { id: proposalId, projectId }, include: proposalInclude })
      : db.proposal.findFirst({ where: { projectId, kind: "ORIGINAL" }, include: proposalInclude }),
    db.aIProviderCredential.findMany({
      where: { workspaceId, isActive: true },
      select: { provider: true, model: true },
    }),
    computeAdditionalScopeDelta(projectId),
  ]);

  // For an ADDITIONAL proposal this is that document's own delta-only
  // snapshot (via its version's requirementVersion), never the project's
  // full current scope — each document always shows exactly what it was
  // generated from.
  const requirementSnapshot = proposal?.versions[0]?.requirementVersion ?? latestRequirementVersion;
  const requirements =
    (requirementSnapshot?.snapshot as unknown as
      | {
          category: string;
          requirement: string;
          confidence: string;
        }[]
      | undefined) ?? [];
  const groupedRequirements = ["FUNCTIONAL", "NON_FUNCTIONAL", "INTEGRATION", "CONSTRAINT"].map(
    (category) => ({
      category,
      items: requirements.filter((r) => r.category === category),
    })
  );

  const latestVersion = proposal?.versions[0];
  const content = latestVersion?.content as unknown as ProposalContent | undefined;

  const [share, latestChangeRequest] = await Promise.all([
    proposal ? db.proposalShare.findFirst({ where: { proposalId: proposal.id } }) : null,
    proposal
      ? db.proposalChangeRequest.findFirst({
          where: { proposalId: proposal.id },
          orderBy: { createdAt: "desc" },
        })
      : null,
  ]);
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const branding = project.workspace.branding;
  const accentColor = proposal ? resolveAccentColor(proposal, branding) : null;
  const termsAndConditions = proposal ? resolveTermsAndConditions(proposal, branding) : null;

  // Accepted is a full, permanent lock — there's no path back to editable
  // once accepted, so resend never applies there. Rejected stays resendable
  // once content actually changes, same as before.
  const isAccepted = share?.status === "ACCEPTED";
  // Rejected is equally a permanent lock on THIS version — no blind
  // regenerate, and Edit (below) routes to a form that creates a new
  // version instead of overwriting the rejected one. "Revise with AI" is
  // the guided alternative to that same manual path.
  const isRejected = share?.status === "REJECTED";
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
          title="Proposal"
          description="Draft, review, and export the proposal for this project."
        />
        {latestVersion && (
          <div className="flex items-center gap-2">
            {proposal?.kind === "ADDITIONAL" && (
              <Badge variant="outline">{documentKindLabel(proposal.kind)}</Badge>
            )}
            {!isAccepted && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <Link href={`/projects/${projectId}/proposal/edit${proposal ? `?id=${proposal.id}` : ""}`}>
                    <Pencil />
                    Edit
                  </Link>
                }
              />
            )}
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a href={`/api/proposals/${proposal!.id}/pdf`}>
                  <Download />
                  Download PDF
                </a>
              }
            />
          </div>
        )}
      </div>

      {share?.status === "REJECTED" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="flex items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-4" />
              Rejected
            </CardTitle>
            {share.respondedAt && (
              <span className="text-xs text-muted-foreground">{formatDateTime(share.respondedAt)}</span>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {share.rejectionReason ? (
                <>
                  <span className="font-medium">Client said: </span>
                  {share.rejectionReason}
                </>
              ) : (
                <span className="text-muted-foreground">
                  The client didn&apos;t give a reason.
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* An addressed change request stops being shown once a later, more
          definitive decision exists (Accepted/Rejected) — at that point it's
          just noise next to the terminal banner below. A still-open one
          (rare once terminal, but possible) keeps showing regardless, since
          that's live context for why the client may have decided the way
          they did. */}
      {latestChangeRequest && !(latestChangeRequest.resolvedAt && (isAccepted || isRejected)) && (
        <Card
          className={
            latestChangeRequest.resolvedAt ? undefined : "border-warning/40 bg-warning/5"
          }
        >
          <CardHeader className="flex items-center justify-between space-y-0">
            <CardTitle
              className={
                latestChangeRequest.resolvedAt
                  ? "flex items-center gap-2 text-muted-foreground"
                  : "flex items-center gap-2 text-warning"
              }
            >
              <AlertCircle className="size-4" />
              {latestChangeRequest.resolvedAt ? "Changes Requested — Addressed" : "Changes Requested"}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(latestChangeRequest.createdAt)}
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              <span className="font-medium">Client requested: </span>
              {latestChangeRequest.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Whether THIS document already has a version is checked first — it's
          the most specific signal and applies identically to Original and
          Additional proposals. An Additional proposal always has v1 the
          moment it exists (created atomically by
          generateAdditionalProposalAction), so it only ever lands in the
          Accepted or Revise-with-AI branch below, never the "nothing
          generated yet" one, which is Original-only. */}
      {latestVersion && proposal ? (
        isAccepted ? (
          <Card>
            <CardHeader>
              <CardTitle>Accepted</CardTitle>
              <CardDescription>
                The client has accepted this proposal — its content is locked and can never be
                regenerated or edited from here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {additionalScopeDelta.eligible ? (
                additionalScopeDelta.deltaRequirements.length > 0 ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-info/40 bg-info/5 p-3">
                    <p className="text-sm">
                      <span className="font-medium">
                        {additionalScopeDelta.deltaRequirements.length} newly-approved requirement
                        {additionalScopeDelta.deltaRequirements.length === 1 ? "" : "s"}
                      </span>{" "}
                      {additionalScopeDelta.deltaRequirements.length === 1 ? "isn't" : "aren't"} in any
                      document yet.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      nativeButton={false}
                      render={<Link href={`/projects/${projectId}`}>Go to Additional Scope</Link>}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No new approved requirements yet — once you approve something new, it&apos;ll
                    show up here as Additional Scope.
                  </p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  To change scope from here, the quotation needs to be accepted first — then any
                  newly approved requirement becomes Additional Scope, priced and shared separately
                  from this proposal.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Revise with AI</CardTitle>
              {isRejected && !canResend && (
                <CardDescription>
                  This creates an independent new version — the rejected one stays exactly as the
                  client saw it. Once it&apos;s ready, a &ldquo;Resend&rdquo; option appears below to
                  send it back to the client for a new decision.
                </CardDescription>
              )}
              {!isRejected && share && (
                <CardDescription>
                  This updates the shared link&apos;s content directly — review the change preview
                  carefully before confirming.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {providerCredentials.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No AI provider is configured yet.{" "}
                  <Link href="/settings/ai-providers" className="underline underline-offset-4">
                    Add one in Settings
                  </Link>
                  .
                </p>
              ) : (
                <ReviseProposalForm proposalId={proposal.id} />
              )}
            </CardContent>
          </Card>
        )
      ) : proposal?.kind === "ADDITIONAL" ? null : !latestRequirementVersion ? (
        <Card>
          <CardHeader>
            <CardTitle>Proposal</CardTitle>
            <CardDescription>
              Generate a proposal from your approved requirements. Requires approved requirements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/projects/${projectId}/requirements`}>View Requirements</Link>}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Generate with AI</CardTitle>
          </CardHeader>
          <CardContent>
            {providerCredentials.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No AI provider is configured yet.{" "}
                <Link href="/settings/ai-providers" className="underline underline-offset-4">
                  Add one in Settings
                </Link>
                .
              </p>
            ) : (
              <GenerateProposalForm projectId={projectId} />
            )}
          </CardContent>
        </Card>
      )}

      {content && proposal && (
        <Card>
          <CardHeader>
            <CardTitle>Share with client</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareProposalPanel
              proposalId={proposal.id}
              share={share}
              baseUrl={baseUrl}
              canResend={canResend}
            />
          </CardContent>
        </Card>
      )}

      {content && share && !isAccepted && (
        <Card>
          <CardHeader>
            <CardTitle>Follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            {providerCredentials.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No AI provider is configured yet.{" "}
                <Link href="/settings/ai-providers" className="underline underline-offset-4">
                  Add one in Settings
                </Link>{" "}
                to draft a follow-up message.
              </p>
            ) : (
              <FollowUpForm projectId={projectId} />
            )}
          </CardContent>
        </Card>
      )}

      {content && accentColor && (
        <DocumentBrandingHeader
          workspaceId={project.workspace.id}
          workspaceName={project.workspace.name}
          branding={branding}
          accentColor={accentColor}
        />
      )}

      {content && (
        <>
          <Card>
            <CardHeader className="flex items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                {content.coverTitle}
                <Badge variant="ai">Draft — AI Generated</Badge>
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Version {latestVersion!.version} · {formatDateTime(latestVersion!.createdAt)}
              </span>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p>{project.lead.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p>{project.lead.company || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prepared</p>
                <p>{formatDate(latestVersion!.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact</p>
                <p>{project.lead.email || project.lead.phone || "—"}</p>
              </div>
            </CardContent>
          </Card>

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
              <CardTitle>Business understanding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{content.businessUnderstanding}</p>
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

          <Card>
            <CardHeader>
              <CardTitle>Functional requirements</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {groupedRequirements.map(
                (group) =>
                  group.items.length > 0 && (
                    <div key={group.category}>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        {requirementCategoryLabel(group.category)}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {group.items.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">{confidenceLabel(item.confidence)} confidence</Badge>
                            {item.requirement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
              )}
            </CardContent>
          </Card>

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
              <CardTitle>Technology stack</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={content.technologyStack} />
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
              <CardTitle>Assumptions</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={content.assumptions} />
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

          <Card>
            <CardHeader>
              <CardTitle>Payment terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{content.paymentTerms}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next steps</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={content.nextSteps} />
            </CardContent>
          </Card>

          {proposal!.versions.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Version history</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {proposal!.versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">v{v.version}</Badge>
                      {v.version === proposal!.currentVersion ? (
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

          {proposal && !isAccepted && (
            <Card>
              <CardHeader>
                <CardTitle>Branding for this document</CardTitle>
                <CardDescription>
                  Optional overrides of the workspace defaults — leave blank to use them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentBrandingOverrideForm
                  action={updateProposalBrandingAction.bind(null, proposal.id)}
                  defaultAccentColor={proposal.accentColor}
                  defaultTermsAndConditions={proposal.termsAndConditions}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
