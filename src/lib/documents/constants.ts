import type { DocumentKind, DocumentStatus } from "@/generated/prisma/enums";

const STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  CHANGES_REQUESTED: "Changes Requested",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  SUPERSEDED: "Superseded",
};

export function documentStatusLabel(status: DocumentStatus) {
  return STATUS_LABELS[status];
}

// EXPIRED is defined in the enum (and has a label/badge, in case it's wired
// up later) but no code path ever actually sets it on either document type
// today — excluded from both filter lists below so it's never offered as a
// choice that can never match anything.
//
// CHANGES_REQUESTED is proposal-only: quotations have no "request changes"
// flow (see quotation-share.ts) and can never reach that status.
//
// SUPERSEDED is quotation-only: the only place it's ever written is
// proposal-share.ts's acceptProposalAction, which marks a stale ORIGINAL
// *quotation* superseded when the proposal's scope changed before that
// quotation was accepted — a Proposal's own status is never set to
// SUPERSEDED anywhere.
export const PROPOSAL_STATUSES: { value: DocumentStatus; label: string }[] = (
  ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "CHANGES_REQUESTED", "REJECTED"] as const
).map((value) => ({ value, label: STATUS_LABELS[value] }));

export const QUOTATION_STATUSES: { value: DocumentStatus; label: string }[] = (
  ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "SUPERSEDED"] as const
).map((value) => ({ value, label: STATUS_LABELS[value] }));

export function documentStatusBadgeVariant(
  status: DocumentStatus
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" {
  switch (status) {
    case "ACCEPTED":
      return "success";
    case "REJECTED":
    case "EXPIRED":
      return "destructive";
    case "CHANGES_REQUESTED":
      return "warning";
    case "SENT":
      return "info";
    case "VIEWED":
      return "secondary";
    case "DRAFT":
      return "outline";
    case "SUPERSEDED":
      return "outline";
  }
}

const KIND_LABELS: Record<DocumentKind, string> = {
  ORIGINAL: "Original Scope",
  ADDITIONAL: "Additional Scope",
};

export function documentKindLabel(kind: DocumentKind) {
  return KIND_LABELS[kind];
}
