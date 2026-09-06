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

const ALL = "ALL";

// Generic reusable version of LeadsFilterBar — a debounced search box plus
// one status dropdown, both driven through URL search params so the list
// page itself stays a plain server component. Used by the Requirements,
// Proposals, and Quotations overview pages.
export function SearchFilterBar({
  defaultQuery,
  defaultStatus,
  searchPlaceholder,
  statusOptions,
  statusPlaceholder = "All statuses",
}: {
  defaultQuery: string;
  defaultStatus: string;
  searchPlaceholder: string;
  statusOptions: { value: string; label: string }[];
  statusPlaceholder?: string;
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

  const hasFilters = !!defaultQuery || !!defaultStatus;
  const resolveLabel = (v: string) => statusOptions.find((o) => o.value === v)?.label ?? v;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-placeholder" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>
      <Select
        value={defaultStatus || ALL}
        onValueChange={(v) => updateParams({ status: !v || v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-48">
          <SelectValue>{(v: string | null) => (v && v !== ALL ? resolveLabel(v) : statusPlaceholder)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{statusPlaceholder}</SelectItem>
          {statusOptions.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
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
