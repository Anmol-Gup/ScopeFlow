import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadForm } from "@/components/leads/lead-form";
import { updateLeadAction } from "@/server/actions/leads";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspaceId } = await requireWorkspaceAccess();

  const [lead, members] = await Promise.all([
    db.lead.findFirst({ where: { id, workspaceId } }),
    db.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  if (!lead) notFound();

  const memberOptions = members.map((m) => ({
    id: m.user.id,
    label: m.user.name || m.user.email,
  }));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title={`Edit ${lead.name}`} />
      <LeadForm
        action={updateLeadAction.bind(null, lead.id)}
        members={memberOptions}
        defaults={{
          name: lead.name,
          company: lead.company ?? "",
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          website: lead.website ?? "",
          source: lead.source,
          industry: lead.industry ?? "",
          estimatedBudget: lead.estimatedBudget?.toString() ?? "",
          expectedTimeline: lead.expectedTimeline ?? "",
          ownerId: lead.ownerId ?? "",
          priority: lead.priority,
          notes: lead.notes ?? "",
        }}
        submitLabel="Save changes"
      />
    </div>
  );
}
