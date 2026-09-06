import Link from "next/link";
import type { Metadata } from "next";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

// Root-level not-found.tsx catches every unmatched route across the whole
// app (not just notFound() calls inside a segment) — this is what a bad or
// stale link (an expired share token, a hand-typed URL missing a segment,
// etc.) actually renders, so it needs a real way out, not a dead end.
export default async function NotFound() {
  const user = await getCurrentUser();
  const homeHref = user ? "/dashboard" : "/";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-5 px-4 text-center">
      <FileQuestion className="size-10 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist — the link may be broken, out of
          date, or incomplete.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href={homeHref}>{user ? "Back to Dashboard" : "Back to Home"}</Link>} />
    </div>
  );
}
