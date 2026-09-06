import { notFound } from "next/navigation";
import { Plus, ListChecks } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { RequirementTable } from "@/components/requirements/requirement-table";
import { ApprovedVersionsList } from "@/components/requirements/approved-versions-list";
import { AddClientInformationDialog } from "@/components/requirements/add-client-information-dialog";
import { ApproveRequirementsForm } from "@/components/requirements/approve-requirements-form";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import {
  computeRequirementScopeMap,
  getLockedRequirementIds,
  getRequirementIdsCoveredByAnyProposal,
} from "@/lib/requirements/scope";

export default async function RequirementsReviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { workspaceId } = await requireWorkspaceAccess();

  const project = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) notFound();

  const [requirements, versions, providerCredentials, scopeMap, lockedRequirementIds, proposalCoveredIds] =
    await Promise.all([
      db.requirement.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
      db.requirementVersion.findMany({ where: { projectId }, orderBy: { version: "desc" } }),
      db.aIProviderCredential.findMany({
        where: { workspaceId, isActive: true },
        select: { provider: true, model: true },
      }),
      computeRequirementScopeMap(projectId),
      getLockedRequirementIds(projectId),
      getRequirementIdsCoveredByAnyProposal(projectId),
    ]);

  const approvedCount = requirements.filter((r) => r.status === "APPROVED").length;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={`/projects/${projectId}`} label={project.name} />
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={`Requirements — ${project.name}`}
          description="Review and approve what the AI extracted before it's used in a proposal."
        />
        <div className="flex items-center gap-2">
          <AddClientInformationDialog
            projectId={projectId}
            hasAiProvider={providerCredentials.length > 0}
            trigger={{ content: "Add Information", size: "sm" }}
          />
        </div>
      </div>

      {requirements.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
          <ListChecks className="size-7 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">No requirements yet.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add requirements from a client conversation or project brief.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AddClientInformationDialog
              projectId={projectId}
              hasAiProvider={providerCredentials.length > 0}
              trigger={{
                content: (
                  <>
                    <Plus />
                    Add Information
                  </>
                ),
                size: "sm",
              }}
            />
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <RequirementTable
              items={requirements}
              scopeMap={scopeMap}
              lockedRequirementIds={Array.from(lockedRequirementIds)}
              contentLockedIds={Array.from(proposalCoveredIds)}
            />
          </CardContent>
        </Card>
      )}

      {requirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lock approved scope</CardTitle>
            <CardDescription>
              Marking a requirement &ldquo;Approved&rdquo; above just flags it as reviewed — locking
              creates the actual snapshot that proposal generation uses.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {approvedCount > 0
                ? `This locks a snapshot of your ${approvedCount} currently-approved requirement${approvedCount === 1 ? "" : "s"} as a new version.`
                : "Mark at least one requirement Approved above before you can lock a version."}
            </p>
            <ApproveRequirementsForm projectId={projectId} disabled={approvedCount === 0} />
            {versions.length > 0 && (
              <ApprovedVersionsList
                versions={versions.map((v) => ({
                  id: v.id,
                  version: v.version,
                  requirementCount: Array.isArray(v.snapshot) ? v.snapshot.length : 0,
                  changesSummary: v.changesSummary,
                  createdAt: v.createdAt,
                }))}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
