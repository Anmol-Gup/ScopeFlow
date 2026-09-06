import type { DocumentStatus, ProjectStatus } from "@/generated/prisma/enums";

// A Project's position in the Lead → Project → Requirements → Proposal →
// Quotation → In Progress workflow, derived from its own status plus its
// most recent Proposal/Quotation status — not a stored column.
export type ProjectPipelineStage =
  | "REQUIREMENTS"
  | "PROPOSAL_SENT"
  | "CHANGES_REQUESTED"
  | "READY_FOR_QUOTATION"
  | "QUOTATION_SENT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

const STAGE_META: Record<ProjectPipelineStage, { label: string; variant: BadgeVariant }> = {
  REQUIREMENTS: { label: "Requirements", variant: "secondary" },
  PROPOSAL_SENT: { label: "Proposal Sent", variant: "info" },
  CHANGES_REQUESTED: { label: "Changes Requested", variant: "warning" },
  READY_FOR_QUOTATION: { label: "Ready for Quotation", variant: "default" },
  QUOTATION_SENT: { label: "Quotation Sent", variant: "info" },
  IN_PROGRESS: { label: "In Progress", variant: "success" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export const PROJECT_PIPELINE_STAGES: { value: ProjectPipelineStage; label: string }[] = (
  Object.entries(STAGE_META) as [ProjectPipelineStage, (typeof STAGE_META)[ProjectPipelineStage]][]
).map(([value, meta]) => ({ value, label: meta.label }));

export function projectPipelineStageLabel(stage: ProjectPipelineStage) {
  return STAGE_META[stage].label;
}

export function projectPipelineStageBadgeVariant(stage: ProjectPipelineStage): BadgeVariant {
  return STAGE_META[stage].variant;
}

export function deriveProjectPipelineStage(project: {
  status: ProjectStatus;
  latestProposalStatus: DocumentStatus | null;
  latestQuotationStatus: DocumentStatus | null;
}): ProjectPipelineStage {
  if (project.status === "CANCELLED") return "CANCELLED";
  if (project.status === "COMPLETED") return "COMPLETED";
  if (project.status === "ACTIVE") return "IN_PROGRESS";

  const { latestProposalStatus, latestQuotationStatus } = project;
  if (latestQuotationStatus === "SENT" || latestQuotationStatus === "VIEWED") return "QUOTATION_SENT";
  if (latestProposalStatus === "CHANGES_REQUESTED") return "CHANGES_REQUESTED";
  if (latestProposalStatus === "ACCEPTED") return "READY_FOR_QUOTATION";
  if (latestProposalStatus === "SENT" || latestProposalStatus === "VIEWED") return "PROPOSAL_SENT";
  return "REQUIREMENTS";
}
