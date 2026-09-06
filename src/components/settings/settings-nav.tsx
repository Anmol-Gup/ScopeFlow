"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/settings", label: "General" },
  { href: "/settings/branding", label: "Branding" },
  { href: "/settings/ai-providers", label: "AI Providers" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-border">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
