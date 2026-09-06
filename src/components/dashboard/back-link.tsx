import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground",
        className
      )}
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  );
}
