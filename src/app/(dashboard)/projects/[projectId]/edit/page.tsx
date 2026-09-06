import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProjectEditForm } from "@/components/projects/project-edit-form";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { workspaceId } = await requireWorkspaceAccess();

  const project = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title={`Edit ${project.name}`} />
      <ProjectEditForm
        projectId={project.id}
        defaults={{
          name: project.name,
          overview: project.overview ?? "",
          timeline: project.timeline ?? "",
          budget: project.budget?.toString() ?? "",
          status: project.status,
        }}
        cancelHref={`/projects/${projectId}`}
      />
    </div>
  );
}
