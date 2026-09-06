import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductVisual } from "@/components/marketing/product-visual";

export function HeroSection() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:gap-16 lg:py-28">
      <div className="flex max-w-2xl flex-col items-start gap-6 text-left">
        <span className="rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-muted-foreground">
          AI-powered proposal workflow for agencies
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Turn Client Requirements Into Professional Proposals
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground text-balance">
          Paste your client&apos;s requirements, let AI structure them into a professional
          proposal, manage revisions, create quotations, and move accepted work into a project.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link href="/signup">
                Start Free
                <ArrowRight />
              </Link>
            }
          />
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<a href="#how-it-works">See How It Works</a>}
          />
        </div>
        <p className="text-xs text-muted-foreground">No credit card required.</p>
      </div>
      <div className="w-full lg:w-auto lg:shrink-0">
        <ProductVisual />
      </div>
    </section>
  );
}
