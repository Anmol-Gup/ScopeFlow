import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <section className="border-t border-border bg-accent/40">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Stop rebuilding proposals from scratch.
        </h2>
        <p className="max-w-xl text-muted-foreground">
          Turn your next client brief into a professional proposal in minutes.
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
      </div>
    </section>
  );
}
