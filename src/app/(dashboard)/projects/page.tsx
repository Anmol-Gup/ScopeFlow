import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ListPagination } from "@/components/dashboard/list-pagination";
import { SearchFilterBar } from "@/components/dashboard/search-filter-bar";
import { CreateProjectGlobalDialog } from "@/components/projects/create-project-global-dialog";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { projectStatusLabel, projectStatusBadgeVariant, PROJECT_STATUSES } from "@/lib/projects/constants";
import { PAGE_SIZE, parsePageParam } from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";
import type { ProjectStatus } from "@/generated/prisma/enums";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { workspaceId } = await requireWorkspaceAccess();
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const search = params.q?.trim() || "";
  const status = params.status?.trim() || "";
  const hasFilters = !!search || !!status;

  const projectsWhere: Prisma.ProjectWhereInput = {
    workspaceId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { lead: { name: { contains: search, mode: "insensitive" as const } } },
            { lead: { company: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(status ? { status: status as ProjectStatus } : {}),
  };

  const [projects, total, allLeads] = await Promise.all([
    db.project.findMany({
      where: projectsWhere,
      orderBy: { updatedAt: "desc" },
      include: {
        lead: { select: { name: true, company: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.project.count({ where: projectsWhere }),
    db.lead.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, company: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <PageHeader
          title="Projects"
          description="Every engagement in scoping or delivery, one per client project."
        />
        <CreateProjectGlobalDialog leads={allLeads} />
      </div>
      <SearchFilterBar
        defaultQuery={search}
        defaultStatus={status}
        searchPlaceholder="Search by project or client..."
        statusOptions={PROJECT_STATUSES}
      />
      {total === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={hasFilters ? "No projects match your filters" : "No projects yet"}
          description={
            hasFilters
              ? "Try a different search term or clear the filters."
              : "Create a project under a lead to start scoping requirements, drafting a proposal, and pricing the work."
          }
        />
      ) : (
        <>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link href={`/projects/${project.id}`}>
                      <span className="font-medium">{project.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {project.lead.company || project.lead.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={projectStatusBadgeVariant(project.status)}>
                      {projectStatusLabel(project.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {project.budget ? formatCurrency(project.budget.toString()) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDate(project.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ListPagination
          basePath="/projects"
          page={page}
          totalPages={totalPages}
          extraParams={{ q: search, status }}
        />
        </>
      )}
    </div>
  );
}
