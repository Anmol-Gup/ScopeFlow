import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const PRODUCT_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#proposal-vs-quotation", label: "Proposal vs. quotation" },
  { href: "#beta", label: "Beta" },
  { href: "#faq", label: "FAQ" },
];

const ACCOUNT_LINKS = [
  { href: "/signup", label: "Join the beta" },
  { href: "/login", label: "Log in" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            The proposal, quotation, and project workflow for agencies and service businesses.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Product</p>
            <ul className="flex flex-col gap-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Account</p>
            <ul className="flex flex-col gap-2">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-6 sm:px-6">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} ScopeFlow. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
