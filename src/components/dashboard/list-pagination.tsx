import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ListPagination({
  basePath,
  page,
  totalPages,
  extraParams,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  extraParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function href(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extraParams ?? {})) {
      if (value) params.set(key, value);
    }
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft />
            Previous
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={href(page - 1)} />}
          >
            <ChevronLeft />
            Previous
          </Button>
        )}
        {page >= totalPages ? (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={href(page + 1)} />}
          >
            Next
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );
}
