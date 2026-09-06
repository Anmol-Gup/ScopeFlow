import type {
  RequirementStatus,
  RequirementCategory,
  Priority,
  Confidence,
} from "@/generated/prisma/enums";

const STATUS_LABELS: Record<RequirementStatus, string> = {
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const REQUIREMENT_STATUSES: { value: RequirementStatus; label: string }[] =
  Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value: value as RequirementStatus,
    label,
  }));

export function requirementStatusLabel(status: RequirementStatus | string) {
  return STATUS_LABELS[status as RequirementStatus] ?? status;
}

export function requirementStatusBadgeVariant(
  status: RequirementStatus | string
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING_APPROVAL":
      return "warning";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

export function priorityLabel(priority: Priority | string) {
  return String(priority).charAt(0) + String(priority).slice(1).toLowerCase();
}

export function confidenceLabel(confidence: Confidence | string) {
  return String(confidence).charAt(0) + String(confidence).slice(1).toLowerCase();
}

const CATEGORY_LABELS: Record<RequirementCategory, string> = {
  FUNCTIONAL: "Functional",
  NON_FUNCTIONAL: "Non-Functional",
  INTEGRATION: "Integration",
  CONSTRAINT: "Constraint",
};

export const REQUIREMENT_CATEGORIES: { value: RequirementCategory; label: string }[] =
  Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value: value as RequirementCategory,
    label,
  }));

export function requirementCategoryLabel(category: RequirementCategory | string) {
  return CATEGORY_LABELS[category as RequirementCategory] ?? category;
}
