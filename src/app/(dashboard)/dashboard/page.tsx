import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PipelineValueHero } from "@/components/dashboard/pipeline-value-hero";
import { WorkflowMetricTile } from "@/components/dashboard/workflow-metric-tile";
import { NeedsAttentionSection } from "@/components/dashboard/needs-attention";
import { RecentProjectsTable } from "@/components/dashboard/recent-projects-table";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { PipelineStageBar } from "@/components/dashboard/pipeline-stage-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireWorkspaceAccess, getCurrentUser } from "@/lib/workspace";
import { db } from "@/lib/db";
import { deriveProjectPipelineStage, type ProjectPipelineStage } from "@/lib/projects/pipeline";
import { computeAdditionalScopeDelta } from "@/lib/requirements/scope";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { workspaceId } = await requireWorkspaceAccess();
  const user = await getCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const [
    totalLeads,
    activeLeads,
    activeProjects,
    requirementsAwaitingApproval,
    proposalsAwaitingResponse,
    changesRequestedCount,
    quotationsAwaitingResponseCount,
    wonProjects,
    pipelineBudget,
    projectsNeedingConfirmationRaw,
    changesRequestedRaw,
    quotationsAwaitingResponseRaw,
    allProjectsRaw,
    recentActivityRaw,
    scopeReviewCandidates,
  ] = await Promise.all([
    db.lead.count({ where: { workspaceId } }),
    db.lead.count({ where: { workspaceId, status: { notIn: ["WON", "LOST"] } } }),
    db.project.count({ where: { workspaceId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    db.requirement.count({ where: { status: "PENDING_APPROVAL", project: { workspaceId } } }),
    db.proposal.count({ where: { status: { in: ["SENT", "VIEWED"] }, project: { workspaceId } } }),
    db.proposalChangeRequest.count({ where: { resolvedAt: null, proposal: { project: { workspaceId } } } }),
    db.quotation.count({ where: { status: { in: ["SENT", "VIEWED"] }, project: { workspaceId } } }),
    db.project.count({ where: { workspaceId, status: "ACTIVE" } }),
    db.project.aggregate({
      where: { workspaceId, status: { notIn: ["COMPLETED", "CANCELLED", "ACTIVE"] } },
      _sum: { budget: true },
    }),
    db.project.findMany({
      where: { workspaceId, requirements: { some: { status: "PENDING_APPROVAL" } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        lead: { select: { name: true } },
        _count: { select: { requirements: { where: { status: "PENDING_APPROVAL" } } } },
      },
    }),
    db.proposalChangeRequest.findMany({
      where: { resolvedAt: null, proposal: { project: { workspaceId } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        proposal: {
          select: {
            id: true,
            currentVersion: true,
            project: { select: { id: true, name: true, lead: { select: { name: true } } } },
          },
        },
      },
    }),
    db.quotation.findMany({
      where: { status: { in: ["SENT", "VIEWED"] }, project: { workspaceId } },
      orderBy: { updatedAt: "asc" },
      take: 5,
      select: {
        id: true,
        currentVersion: true,
        project: { select: { id: true, name: true, lead: { select: { name: true } } } },
      },
    }),
    db.project.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        lead: { select: { name: true, company: true } },
        proposals: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
        quotations: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      },
    }),
    db.activity.findMany({
      where: {
        workspaceId,
        OR: [
          { type: { startsWith: "project." } },
          { type: { startsWith: "requirement" } },
          { type: { startsWith: "proposal." } },
          { type: { startsWith: "quotation." } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        description: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
      },
    }),
    // Narrow candidate set before computing the (more expensive) exact
    // uncovered-requirement delta per project below — only projects that
    // could possibly need scope review at all.
    db.project.findMany({
      where: {
        workspaceId,
        quotations: { some: { kind: "ORIGINAL", status: "ACCEPTED" } },
        requirements: { some: { status: "APPROVED" } },
      },
      select: { id: true, name: true, lead: { select: { name: true } } },
    }),
  ]);

  const pipelineValue = Number(pipelineBudget._sum.budget ?? 0);

  const needsScopeReviewRaw = (
    await Promise.all(
      scopeReviewCandidates.map(async (project) => ({
        project,
        delta: await computeAdditionalScopeDelta(project.id),
      }))
    )
  ).filter((r) => r.delta.deltaRequirements.length > 0);
  const needsScopeReview = needsScopeReviewRaw.slice(0, 5).map(({ project, delta }) => ({
    id: project.id,
    projectName: project.name,
    leadName: project.lead.name,
    count: delta.deltaRequirements.length,
  }));

  const requirementsNeedingConfirmation = projectsNeedingConfirmationRaw.map((project) => ({
    id: project.id,
    projectName: project.name,
    leadName: project.lead.name,
    count: project._count.requirements,
  }));

  const changesRequested = changesRequestedRaw.map((cr) => ({
    id: cr.proposal.id,
    projectId: cr.proposal.project.id,
    projectName: cr.proposal.project.name,
    leadName: cr.proposal.project.lead.name,
    version: cr.proposal.currentVersion,
  }));

  const quotationsAwaitingResponse = quotationsAwaitingResponseRaw.map((quotation) => ({
    id: quotation.id,
    projectId: quotation.project.id,
    projectName: quotation.project.name,
    leadName: quotation.project.lead.name,
    version: quotation.currentVersion,
  }));

  const recentProjects = allProjectsRaw.slice(0, 6).map((project) => ({
    id: project.id,
    name: project.name,
    leadName: project.lead.company || project.lead.name,
    status: project.status,
    proposalStatus: project.proposals[0]?.status ?? null,
    quotationStatus: project.quotations[0]?.status ?? null,
  }));

  const stageCountMap = allProjectsRaw.reduce(
    (acc, project) => {
      const stage = deriveProjectPipelineStage({
        status: project.status,
        latestProposalStatus: project.proposals[0]?.status ?? null,
        latestQuotationStatus: project.quotations[0]?.status ?? null,
      });
      acc[stage] = (acc[stage] ?? 0) + 1;
      return acc;
    },
    {} as Record<ProjectPipelineStage, number>
  );

  const recentActivity = recentActivityRaw.map((activity) => ({
    id: activity.id,
    description: activity.description,
    createdAt: activity.createdAt,
    project: activity.project,
  }));

  const tiles = [
    { label: "Active Leads", value: activeLeads, href: "/leads" },
    { label: "Active Projects", value: activeProjects, href: "/projects" },
    { label: "Requirements Awaiting Approval", value: requirementsAwaitingApproval, href: "/requirements" },
    { label: "Proposals Awaiting Response", value: proposalsAwaitingResponse, href: "/proposals" },
    { label: "Changes Requested", value: changesRequestedCount, href: "/proposals" },
    { label: "Quotations Awaiting Response", value: quotationsAwaitingResponseCount, href: "/quotations" },
    { label: "Won Projects", value: wonProjects, href: "/projects" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={`${getGreeting()}, ${firstName}`}
          description="A snapshot of your lead-to-project pipeline."
        />
        <Button
          nativeButton={false}
          render={
            <Link href="/leads/new">
              <Plus />
              Add Lead
            </Link>
          }
        />
      </div>

      {totalLeads === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Welcome to ScopeFlow"
          description="Add your first lead to start tracking requirements, proposals, and quotations in one place."
        />
      ) : (
        <>
          {pipelineValue > 0 && <PipelineValueHero value={pipelineValue} />}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {tiles.map((tile) => (
              <WorkflowMetricTile key={tile.label} label={tile.label} value={tile.value} href={tile.href} />
            ))}
          </div>

          <NeedsAttentionSection
            changesRequested={changesRequested}
            requirementsNeedingConfirmation={requirementsNeedingConfirmation}
            quotationsAwaitingResponse={quotationsAwaitingResponse}
            needsScopeReview={needsScopeReview}
          />

          <Card>
            <CardHeader>
              <CardTitle>Recent projects</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentProjectsTable projects={recentProjects} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentActivityList activities={recentActivity} />
            <PipelineStageBar counts={stageCountMap} />
          </div>
        </>
      )}
    </div>
  );
}
