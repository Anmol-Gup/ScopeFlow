"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { documentStatusLabel, documentStatusBadgeVariant } from "@/lib/documents/constants";
import type { DocumentStatus } from "@/generated/prisma/enums";

// Superseded is the one quotation status that isn't self-explanatory on
// sight — everywhere it's shown, pair it with a tooltip explaining why a
// quotation ends up here instead of just Accepted/Rejected.
export function QuotationStatusBadge({ status }: { status: DocumentStatus }) {
  const badge = <Badge variant={documentStatusBadgeVariant(status)}>{documentStatusLabel(status)}</Badge>;

  if (status !== "SUPERSEDED") return badge;

  return (
    <Tooltip>
      <TooltipTrigger render={badge} />
      <TooltipContent>
        Replaced after the proposal&apos;s scope changed and was re-accepted.
      </TooltipContent>
    </Tooltip>
  );
}
