import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="ScopeFlow home">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/login">Log in</Link>}
          />
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/signup">Start Free</Link>}
          />
        </div>
      </div>
    </header>
  );
}
