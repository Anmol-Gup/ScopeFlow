import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-5 shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="scopeflow-mark" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#166534" />
          <stop offset="1" stopColor="#16A34A" />
        </linearGradient>
      </defs>
      <path
        d="M18.5 6.5c0-1.7-1.8-2.5-4.2-2.5-3 0-5.3 1.5-5.3 3.6 0 4.4 9 2.6 9 7.4 0 2.1-2.3 3.6-5.3 3.6-2.4 0-4.2-.8-4.2-2.5"
        stroke="url(#scopeflow-mark)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={iconClassName} />
      <span className="truncate text-base leading-none font-semibold lowercase tracking-tight group-data-[collapsible=icon]:hidden">
        scopeflow
      </span>
    </span>
  );
}
