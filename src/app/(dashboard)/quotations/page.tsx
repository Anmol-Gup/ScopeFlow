import Link from "next/link";
import { Receipt, Plus } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { documentKindLabel, QUOTATION_STATUSES } from "@/lib/documents/constants";
import { QuotationStatusBadge } from "@/components/quotations/quotation-status-badge";
import { PAGE_SIZE, parsePageParam } from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";
import type { DocumentStatus } from "@/generated/prisma/enums";

export default async function QuotationsPage({
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

  const quotationsWhere: Prisma.QuotationWhereInput = {
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

  const [quotations, total, eligibleLeads] = await Promise.all([
    db.quotation.findMany({
      where: quotationsWhere,
      orderBy: { updatedAt: "desc" },
      include: {
        project: { select: { id: true, name: true, lead: { select: { name: true, company: true } } } },
        versions: { orderBy: { version: "desc" }, take: 1, select: { total: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.quotation.count({ where: quotationsWhere }),
    // Only projects whose current proposal is Accepted, AND that don't
    // already have a (non-superseded) ORIGINAL quotation, are valid targets
    // for creating a NEW quotation — a project can only ever get one
    // ORIGINAL quotation; once it exists, "create" here has nothing left to
    // do (view the existing one from the list instead, or once an
    // Additional proposal is separately accepted, create its quotation from
    // the project page). Every project still shows in the picker (disabled
    // otherwise) rather than silently disappearing — see
    // LeadProjectPickerDialog.
    db.lead.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        company: true,
        projects: {
          select: {
            id: true,
            name: true,
            proposals: { where: { kind: "ORIGINAL" }, select: { status: true }, take: 1 },
            quotations: {
              where: { kind: "ORIGINAL", status: { not: "SUPERSEDED" } },
              select: { id: true },
              take: 1,
            },
            // An accepted Additional proposal with no quotation of its own
            // yet still has something to do — just not through this picker
            // (which only ever creates the ORIGINAL quotation; an Additional
            // one is created in-context from the project page instead).
            // Selected here purely to give a more useful ineligible reason
            // than a dead-end "already created".
            _count: {
              select: {
                proposals: {
                  where: { kind: "ADDITIONAL", status: "ACCEPTED", quotations: { none: {} } },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const eligibleLeadsForPicker = eligibleLeads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    company: lead.company,
    projects: lead.projects.map((p) => {
      const proposalStatus = p.proposals[0]?.status;
      const hasQuotation = p.quotations.length > 0;
      const hasAdditionalAwaitingQuotation = p._count.proposals > 0;
      const eligible = proposalStatus === "ACCEPTED" && !hasQuotation;
      return {
        id: p.id,
        name: p.name,
        eligible,
        ineligibleReason: eligible
          ? undefined
          : hasQuotation
            ? hasAdditionalAwaitingQuotation
              ? "original quotation already created — an accepted Additional Scope proposal is awaiting its own quotation, created from the project page"
              : "quotation already created — view it from this list"
            : proposalStatus
              ? "proposal not yet accepted"
              : "no proposal yet",
      };
    }),
  }));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <PageHeader
          title="Quotations"
          description="Negotiable, versioned pricing for every proposal."
        />
        <LeadProjectPickerDialog
          leads={eligibleLeadsForPicker}
          trigger={{ content: <><Plus />Create Quotation</>, size: "sm" }}
          title="Create a quotation"
          description="Only projects whose proposal has been accepted by the client are eligible."
          continueLabel="Continue"
          destinationSuffix="/quotation"
          emptyProjectsHint="This lead has no projects with an accepted proposal yet."
        />
      </div>
      <SearchFilterBar
        defaultQuery={search}
        defaultStatus={status}
        searchPlaceholder="Search by project or client..."
        statusOptions={QUOTATION_STATUSES}
      />
      {total === 0 ? (
        <EmptyState
          icon={Receipt}
          title={hasFilters ? "No quotations match your filters" : "No quotations yet"}
          description={
            hasFilters
              ? "Try a different search term or clear the filters."
              : "Create a quotation once a project's proposal has been accepted by the client."
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
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell>
                    <Link href={`/projects/${quotation.projectId}/quotation?id=${quotation.id}`}>
                      <span className="font-medium">{quotation.project.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {quotation.project.lead.company || quotation.project.lead.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {quotation.kind === "ADDITIONAL" && (
                        <Badge variant="outline">{documentKindLabel(quotation.kind)}</Badge>
                      )}
                      <QuotationStatusBadge status={quotation.status} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">v{quotation.currentVersion}</TableCell>
                  <TableCell className="text-right text-sm">
                    {quotation.versions[0] ? formatCurrency(quotation.versions[0].total.toString()) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDate(quotation.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ListPagination
          basePath="/quotations"
          page={page}
          totalPages={totalPages}
          extraParams={{ q: search, status }}
        />
        </>
      )}
    </div>
  );
}
