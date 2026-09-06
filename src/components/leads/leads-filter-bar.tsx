"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES, LEAD_PRIORITIES, leadStatusLabel, leadPriorityLabel } from "@/lib/leads/constants";
import type { LeadStatus, Priority } from "@/generated/prisma/enums";

const ALL = "ALL";

export function LeadsFilterBar({
  defaultQuery,
  defaultStatus,
  defaultPriority,
}: {
  defaultQuery: string;
  defaultStatus: string;
  defaultPriority: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultQuery);

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    if (query === defaultQuery) return;
    const handle = setTimeout(() => updateParams({ q: query }), 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasFilters = !!defaultQuery || !!defaultStatus || !!defaultPriority;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-placeholder" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search leads..."
          className="pl-9"
        />
      </div>
      <Select
        value={defaultStatus || ALL}
        onValueChange={(v) => updateParams({ status: !v || v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue>
            {(v: string | null) => (v && v !== ALL ? leadStatusLabel(v as LeadStatus) : "All statuses")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={defaultPriority || ALL}
        onValueChange={(v) => updateParams({ priority: !v || v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            {(v: string | null) => (v && v !== ALL ? leadPriorityLabel(v as Priority) : "All priorities")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {LEAD_PRIORITIES.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("");
            router.push(pathname);
          }}
        >
          <X />
          Clear
        </Button>
      )}
    </div>
  );
}
