import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BetaSection() {
  return (
    <section id="beta" className="scroll-mt-16 border-t border-border py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-border bg-accent/40 p-8 text-center sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Early access
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            ScopeFlow is in beta
          </h2>
          <p className="mt-3 text-muted-foreground">
            We&apos;re inviting freelancers, agencies, and service businesses to try ScopeFlow and
            help shape the product before it&apos;s generally available.
          </p>
          <p className="mt-4 text-sm font-semibold text-primary">
            Free for the entire beta — billing plans are coming soon.
          </p>
          <div className="mt-6">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/signup">Join the beta</Link>}
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No commitment, and no credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
