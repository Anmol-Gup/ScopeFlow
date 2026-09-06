import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ListPagination } from "@/components/dashboard/list-pagination";
import { SearchFilterBar } from "@/components/dashboard/search-filter-bar";
import { LeadProjectPickerDialog } from "@/components/shared/lead-project-picker";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import { PAGE_SIZE, parsePageParam } from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";

const APPROVAL_STATUS_OPTIONS = [
  { value: "APPROVED", label: "Approved" },
  { value: "NOT_APPROVED", label: "Not approved" },
];

export default async function RequirementsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { workspaceId } = await requireWorkspaceAccess();
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const search = params.q?.trim() || "";
  const approvalStatus = params.status?.trim() || "";
  const hasFilters = !!search || !!approvalStatus;

  const projectsWhere: Prisma.ProjectWhereInput = {
    workspaceId,
    requirements: { some: {} },
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { lead: { name: { contains: search, mode: "insensitive" as const } } },
            { lead: { company: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(approvalStatus === "APPROVED"
      ? { requirementVersions: { some: {} } }
      : approvalStatus === "NOT_APPROVED"
        ? { requirementVersions: { none: {} } }
        : {}),
  };

  const [projects, total, allLeads] = await Promise.all([
    db.project.findMany({
      where: projectsWhere,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        lead: { select: { name: true, company: true } },
        _count: { select: { requirements: true, requirementVersions: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.project.count({ where: projectsWhere }),
    db.lead.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, company: true, projects: { select: { id: true, name: true } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const needsConfirmationCounts = await db.requirement.groupBy({
    by: ["projectId"],
    where: { projectId: { in: projects.map((p) => p.id) }, status: "PENDING_APPROVAL" },
    _count: { _all: true },
  });
  const needsConfirmationMap = new Map(
    needsConfirmationCounts.map((r) => [r.projectId, r._count._all])
  );

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <PageHeader
          title="Requirements"
          description="Requirements extracted from discovery, awaiting your review and approval."
        />
        <LeadProjectPickerDialog
          leads={allLeads}
          trigger={{ content: <><Plus />Add Requirement</>, size: "sm" }}
          title="Add a requirement"
          description="Choose which project this requirement belongs to."
          continueLabel="Continue"
          destinationSuffix="/requirements"
          emptyProjectsHint="This lead has no projects yet — create one from the lead's page first."
        />
      </div>
      <SearchFilterBar
        defaultQuery={search}
        defaultStatus={approvalStatus}
        searchPlaceholder="Search by project or client..."
        statusOptions={APPROVAL_STATUS_OPTIONS}
      />
      {total === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={hasFilters ? "No projects match your filters" : "No requirements yet"}
          description={
            hasFilters
              ? "Try a different search term or clear the filters."
              : "Paste client information or add a requirement manually from a project's page to get started."
          }
        />
      ) : (
        <>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Needs confirmation</TableHead>
                <TableHead className="text-right">Approval status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link href={`/projects/${project.id}/requirements`}>
                      <span className="font-medium">{project.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {project.lead.company || project.lead.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-sm">{project._count.requirements}</TableCell>
                  <TableCell className="text-right text-sm">
                    {needsConfirmationMap.get(project.id) ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {project._count.requirementVersions > 0 ? (
                      <Badge>Approved · v{project._count.requirementVersions}</Badge>
                    ) : (
                      <Badge variant="outline">Not approved</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ListPagination
          basePath="/requirements"
          page={page}
          totalPages={totalPages}
          extraParams={{ q: search, status: approvalStatus }}
        />
        </>
      )}
    </div>
  );
}
