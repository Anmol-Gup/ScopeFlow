import Link from "next/link";
import { FileText, Plus } from "lucide-react";
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
import { formatDate } from "@/lib/format";
import {
  documentStatusLabel,
  documentStatusBadgeVariant,
  documentKindLabel,
  PROPOSAL_STATUSES,
} from "@/lib/documents/constants";
import { PAGE_SIZE, parsePageParam } from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";
import type { DocumentStatus } from "@/generated/prisma/enums";

export default async function ProposalsPage({
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

  const proposalsWhere: Prisma.ProposalWhereInput = {
    project: { workspaceId },
    ...(search
      ? {
          project: {
            workspaceId,
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { lead: { name: { contains: search, mode: "insensitive" as const } } },
              { lead: { company: { contains: search, mode: "insensitive" as const } } },
            ],
          },
        }
      : {}),
    ...(status ? { status: status as DocumentStatus } : {}),
  };

  const [proposals, total, allLeads] = await Promise.all([
    db.proposal.findMany({
      where: proposalsWhere,
      orderBy: { updatedAt: "desc" },
      include: { project: { select: { id: true, name: true, lead: { select: { name: true, company: true } } } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.proposal.count({ where: proposalsWhere }),
    db.lead.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, company: true, projects: { select: { id: true, name: true } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <PageHeader
          title="Proposals"
          description="Draft, sent, and accepted proposals across every project."
        />
        <LeadProjectPickerDialog
          leads={allLeads}
          trigger={{ content: <><Plus />Create Proposal</>, size: "sm" }}
          title="Create a proposal"
          description="Choose which project to generate a proposal for."
          continueLabel="Continue"
          destinationSuffix="/proposal"
          emptyProjectsHint="This lead has no projects yet — create one from the lead's page first."
        />
      </div>
      <SearchFilterBar
        defaultQuery={search}
        defaultStatus={status}
        searchPlaceholder="Search by project or client..."
        statusOptions={PROPOSAL_STATUSES}
      />
      {total === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No proposals match your filters" : "No proposals yet"}
          description={
            hasFilters
              ? "Try a different search term or clear the filters."
              : "Once a project's requirements are approved, generate a proposal from the project's page."
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
                <TableHead className="text-right">Version</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell>
                    <Link href={`/projects/${proposal.projectId}/proposal?id=${proposal.id}`}>
                      <span className="font-medium">{proposal.project.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {proposal.project.lead.company || proposal.project.lead.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {proposal.kind === "ADDITIONAL" && (
                        <Badge variant="outline">{documentKindLabel(proposal.kind)}</Badge>
                      )}
                      <Badge variant={documentStatusBadgeVariant(proposal.status)}>
                        {documentStatusLabel(proposal.status)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">v{proposal.currentVersion}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDate(proposal.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ListPagination
          basePath="/proposals"
          page={page}
          totalPages={totalPages}
          extraParams={{ q: search, status }}
        />
        </>
      )}
    </div>
  );
}
