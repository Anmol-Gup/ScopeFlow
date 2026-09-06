import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projectStatusLabel, projectStatusBadgeVariant } from "@/lib/projects/constants";
import { documentStatusLabel, documentStatusBadgeVariant } from "@/lib/documents/constants";
import type { DocumentStatus, ProjectStatus } from "@/generated/prisma/enums";

type RecentProjectRow = {
  id: string;
  name: string;
  leadName: string;
  status: ProjectStatus;
  proposalStatus: DocumentStatus | null;
  quotationStatus: DocumentStatus | null;
};

export function RecentProjectsTable({ projects }: { projects: RecentProjectRow[] }) {
  if (projects.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No projects yet — create one under a lead to get started.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Proposal</TableHead>
            <TableHead>Quotation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <Link href={`/projects/${project.id}`} className="font-medium underline underline-offset-4">
                  {project.name}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{project.leadName}</TableCell>
              <TableCell>
                <Badge variant={projectStatusBadgeVariant(project.status)}>
                  {projectStatusLabel(project.status)}
                </Badge>
              </TableCell>
              <TableCell>
                {project.proposalStatus ? (
                  <Badge variant={documentStatusBadgeVariant(project.proposalStatus)}>
                    {documentStatusLabel(project.proposalStatus)}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {project.quotationStatus ? (
                  <Badge variant={documentStatusBadgeVariant(project.quotationStatus)}>
                    {documentStatusLabel(project.quotationStatus)}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
