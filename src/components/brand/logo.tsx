import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static brand asset, not an optimizable content image
  return <img src="/logo-mark.png" alt="" className={cn("size-5 shrink-0 rounded-[22%]", className)} />;
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
