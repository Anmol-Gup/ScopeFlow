import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ListPagination } from "@/components/dashboard/list-pagination";
import { LeadsFilterBar } from "@/components/leads/leads-filter-bar";
import { Button } from "@/components/ui/button";
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
import {
  leadStatusLabel,
  leadStatusBadgeVariant,
  leadPriorityLabel,
  leadPriorityBadgeVariant,
  LEAD_STATUSES,
  LEAD_PRIORITIES,
} from "@/lib/leads/constants";
import { PAGE_SIZE, parsePageParam } from "@/lib/pagination";
import type { LeadStatus, Priority } from "@/generated/prisma/enums";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; priority?: string }>;
}) {
  const { workspaceId } = await requireWorkspaceAccess();
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const search = params.q?.trim() || "";
  const status = LEAD_STATUSES.some((s) => s.value === params.status)
    ? (params.status as LeadStatus)
    : undefined;
  const priority = LEAD_PRIORITIES.some((p) => p.value === params.priority)
    ? (params.priority as Priority)
    : undefined;
  const hasFilters = !!search || !!status || !!priority;

  const where = {
    workspaceId,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { company: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { owner: { select: { name: true, email: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.lead.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <PageHeader
          title="Leads"
          description="Every inquiry your agency has captured, from first contact to close."
        />
        <Button
          nativeButton={false}
          render={
            <Link href="/leads/new">
              <Plus />
              New lead
            </Link>
          }
        />
      </div>
      <LeadsFilterBar
        defaultQuery={search}
        defaultStatus={status ?? ""}
        defaultPriority={priority ?? ""}
      />
      {total === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? "No leads match your filters" : "No leads yet"}
          description={
            hasFilters
              ? "Try a different search term or clear the filters."
              : "Leads you capture from email, WhatsApp, your website, or referrals will show up here."
          }
        />
      ) : (
        <>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Est. budget</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="block">
                      <span className="font-medium">{lead.name}</span>
                      {lead.company && (
                        <span className="block text-sm text-muted-foreground">
                          {lead.company}
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={leadStatusBadgeVariant(lead.status)}>
                      {leadStatusLabel(lead.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={leadPriorityBadgeVariant(lead.priority)}>
                      {leadPriorityLabel(lead.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.owner?.name || lead.owner?.email || "Unassigned"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {lead.estimatedBudget ? formatCurrency(lead.estimatedBudget.toString()) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDate(lead.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ListPagination
          basePath="/leads"
          page={page}
          totalPages={totalPages}
          extraParams={{ q: search, status, priority }}
        />
        </>
      )}
    </div>
  );
}
