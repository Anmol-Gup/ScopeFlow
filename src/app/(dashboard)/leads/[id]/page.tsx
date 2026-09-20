import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { BackLink } from "@/components/dashboard/back-link";
import { LeadStatusSelect } from "@/components/leads/status-select";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import { leadSourceLabel, leadPriorityLabel, leadPriorityBadgeVariant } from "@/lib/leads/constants";
import { projectStatusLabel, projectStatusBadgeVariant } from "@/lib/projects/constants";
import { documentStatusLabel } from "@/lib/documents/constants";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspaceId } = await requireWorkspaceAccess();

  const lead = await db.lead.findFirst({
    where: { id, workspaceId },
    include: {
      owner: { select: { name: true, email: true } },
      projects: {
        orderBy: { createdAt: "desc" },
        include: {
          proposals: { select: { status: true, currentVersion: true }, take: 1 },
          quotations: { select: { status: true, currentVersion: true }, take: 1 },
        },
      },
    },
  });

  if (!lead) notFound();

  const infoItems: { label: string; value: string }[] = [
    { label: "Email", value: lead.email || "—" },
    { label: "Phone", value: lead.phone || "—" },
    { label: "Website", value: lead.website || "—" },
    { label: "Source", value: leadSourceLabel(lead.source) },
    { label: "Industry", value: lead.industry || "—" },
    { label: "Estimated budget", value: lead.estimatedBudget ? formatCurrency(lead.estimatedBudget.toString()) : "—" },
    { label: "Expected timeline", value: lead.expectedTimeline || "—" },
    { label: "Owner", value: lead.owner?.name || lead.owner?.email || "Unassigned" },
    { label: "Created", value: formatDate(lead.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/leads" label="All leads" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
          {lead.company && <p className="text-sm text-muted-foreground">{lead.company}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={leadPriorityBadgeVariant(lead.priority)}>
            {leadPriorityLabel(lead.priority)} priority
          </Badge>
          <LeadStatusSelect leadId={lead.id} status={lead.status} />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/leads/${lead.id}/edit`}>
                <Pencil />
                Edit
              </Link>
            }
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {infoItems.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-sm">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {lead.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <CardTitle>Projects</CardTitle>
          <CreateProjectDialog leadId={lead.id} />
        </CardHeader>
        <CardContent>
          {lead.projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet."
              description="Create a project to start scoping requirements, drafting a proposal, and pricing the work for this client."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {lead.projects.map((project) => {
                const proposal = project.proposals[0];
                const quotation = project.quotations[0];
                return (
                  <li
                    key={project.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/projects/${project.id}`} className="text-sm font-medium underline underline-offset-4">
                          {project.name}
                        </Link>
                        <Badge variant={projectStatusBadgeVariant(project.status)}>
                          {projectStatusLabel(project.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Proposal:{" "}
                        {proposal
                          ? `V${proposal.currentVersion} ${documentStatusLabel(proposal.status)}`
                          : "Not created"}
                        {" · "}
                        Quotation:{" "}
                        {quotation
                          ? `V${quotation.currentVersion} ${documentStatusLabel(quotation.status)}`
                          : "Not created"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/projects/${project.id}`}>Open Project</Link>}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
