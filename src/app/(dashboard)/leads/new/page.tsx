import { PageHeader } from "@/components/dashboard/page-header";
import { LeadForm } from "@/components/leads/lead-form";
import { createLeadAction } from "@/server/actions/leads";
import { requireWorkspaceAccess, getCurrentUser } from "@/lib/workspace";
import { db } from "@/lib/db";

export default async function NewLeadPage() {
  const { workspaceId } = await requireWorkspaceAccess();
  const [members, currentUser] = await Promise.all([
    db.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    getCurrentUser(),
  ]);

  const memberOptions = members.map((m) => ({
    id: m.user.id,
    label: m.user.name || m.user.email,
  }));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="New lead" description="Capture what the client asked for — you can fill in the rest later." />
      <LeadForm
        action={createLeadAction}
        members={memberOptions}
        defaults={{
          name: "",
          company: "",
          email: "",
          phone: "",
          website: "",
          source: "MANUAL",
          industry: "",
          estimatedBudget: "",
          expectedTimeline: "",
          ownerId: currentUser?.id ?? "",
          priority: "MEDIUM",
          notes: "",
        }}
        submitLabel="Create lead"
      />
    </div>
  );
}
