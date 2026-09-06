import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { ProposalEditForm } from "@/components/proposals/proposal-edit-form";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import type { ProposalContent } from "@/lib/ai/schemas";

export default async function EditProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { projectId } = await params;
  const { id: proposalId } = await searchParams;
  const { workspaceId } = await requireWorkspaceAccess();

  const project = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) notFound();

  const shareInclude = { shares: { orderBy: { createdAt: "desc" as const }, take: 1 } };
  const proposal = proposalId
    ? await db.proposal.findFirst({
        where: { id: proposalId, projectId, project: { workspaceId } },
        include: { versions: { orderBy: { version: "desc" }, take: 1 }, ...shareInclude },
      })
    : await db.proposal.findFirst({
        where: { projectId, kind: "ORIGINAL", project: { workspaceId } },
        include: { versions: { orderBy: { version: "desc" }, take: 1 }, ...shareInclude },
      });
  if (!proposal || !proposal.versions[0]) notFound();
  // Checked against the share, not proposal.status — a prior regenerate can
  // already have knocked proposal.status off ACCEPTED even though the
  // client's actual decision (recorded on the share) never changed.
  if (proposal.shares[0]?.status === "ACCEPTED") {
    redirect(`/projects/${projectId}/proposal?id=${proposal.id}`);
  }

  const content = proposal.versions[0].content as unknown as ProposalContent;
  const isRejected = proposal.shares[0]?.status === "REJECTED";

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={`/projects/${projectId}/proposal?id=${proposal.id}`} label={project.name} />
      <PageHeader
        title="Edit proposal"
        description={
          isRejected
            ? "The rejected version stays on record — saving creates a new, independent version."
            : "Changes save to the current draft version."
        }
      />
      <ProposalEditForm
        proposalId={proposal.id}
        content={content}
        cancelHref={`/projects/${projectId}/proposal?id=${proposal.id}`}
        isRejected={isRejected}
      />
    </div>
  );
}
