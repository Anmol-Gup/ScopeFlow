import type { ProjectStatus } from "@/generated/prisma/enums";

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  SCOPING: "Scoping",
  ACTIVE: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = Object.entries(
  PROJECT_STATUS_LABELS
).map(([value, label]) => ({ value: value as ProjectStatus, label }));

export function projectStatusLabel(status: ProjectStatus) {
  return PROJECT_STATUS_LABELS[status];
}

export function projectStatusBadgeVariant(
  status: ProjectStatus
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" {
  switch (status) {
    case "SCOPING":
      return "secondary";
    case "ACTIVE":
      return "info";
    case "COMPLETED":
      return "success";
    case "ON_HOLD":
      return "warning";
    case "CANCELLED":
      return "destructive";
  }
}
