"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

const VISIBLE_COUNT = 5;

type ApprovedVersion = {
  id: string;
  version: number;
  requirementCount: number;
  changesSummary: string | null;
  createdAt: Date;
};

// A long-running project can lock dozens of scope versions over time — full
// history is worth keeping (it's the audit trail this app is built around),
// but showing all of it by default just makes the page longer with every
// lock. Only the most recent few show initially; the rest are one click away.
export function ApprovedVersionsList({ versions }: { versions: ApprovedVersion[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? versions : versions.slice(0, VISIBLE_COUNT);
  const hasMore = versions.length > VISIBLE_COUNT;

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <p className="text-xs font-medium text-muted-foreground">Approved versions</p>
      {visible.map((v) => (
        <div key={v.id} className="flex items-center justify-between text-sm">
          <span>
            <Badge variant="outline">v{v.version}</Badge> {v.requirementCount} requirements
            {v.changesSummary ? ` — ${v.changesSummary}` : ""}
          </span>
          <span className="text-xs text-muted-foreground">{formatDateTime(v.createdAt)}</span>
        </div>
      ))}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : `Show all ${versions.length} versions`}
        </Button>
      )}
    </div>
  );
}
