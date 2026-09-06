import type { LeadSource, LeadStatus, Priority } from "@/generated/prisma/enums";

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: "WEBSITE", label: "Website" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "REFERRAL", label: "Referral" },
  { value: "MANUAL", label: "Manual" },
  { value: "OTHER", label: "Other" },
];

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ACTIVE", label: "Active" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export const LEAD_PRIORITIES: { value: Priority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const STATUS_LABEL_MAP = Object.fromEntries(LEAD_STATUSES.map((s) => [s.value, s.label])) as Record<
  LeadStatus,
  string
>;
const SOURCE_LABEL_MAP = Object.fromEntries(LEAD_SOURCES.map((s) => [s.value, s.label])) as Record<
  LeadSource,
  string
>;
const PRIORITY_LABEL_MAP = Object.fromEntries(
  LEAD_PRIORITIES.map((p) => [p.value, p.label])
) as Record<Priority, string>;

export function leadStatusLabel(status: LeadStatus) {
  return STATUS_LABEL_MAP[status];
}
export function leadSourceLabel(source: LeadSource) {
  return SOURCE_LABEL_MAP[source];
}
export function leadPriorityLabel(priority: Priority) {
  return PRIORITY_LABEL_MAP[priority];
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

export function leadStatusBadgeVariant(status: LeadStatus): BadgeVariant {
  switch (status) {
    case "WON":
      return "success";
    case "LOST":
      return "destructive";
    case "NEW":
    case "CONTACTED":
      return "secondary";
    case "ACTIVE":
      return "info";
  }
}

export function leadPriorityBadgeVariant(priority: Priority): BadgeVariant {
  switch (priority) {
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "secondary";
  }
}
