import { ArrowDown, Sparkles, FileText, CheckCircle2, Receipt, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STAGES = [
  {
    icon: FileText,
    title: "Client requirements",
    detail: "“We need an online store with Razorpay, customer logins, and order tracking.”",
    badge: null,
  },
  {
    icon: Sparkles,
    title: "AI-generated proposal",
    detail: "Executive summary, scope of work, timeline, and pricing — structured automatically.",
    badge: { label: "Draft — AI generated", variant: "ai" as const },
  },
  {
    icon: CheckCircle2,
    title: "Client review",
    detail: "The client accepts, or requests changes — you get a clear, versioned trail either way.",
    badge: { label: "Accepted", variant: "success" as const },
  },
  {
    icon: Receipt,
    title: "Quotation",
    detail: "Line items, tax, and totals — created only after the proposal is accepted.",
    badge: { label: "Accepted", variant: "success" as const },
  },
  {
    icon: FolderKanban,
    title: "Project",
    detail: "Accepted work moves straight into delivery, still linked back to its scope.",
    badge: { label: "In Progress", variant: "info" as const },
  },
];

// A faithful, simplified mock of the real ScopeFlow workflow — built from
// the same Card/Badge visual language as the actual product, not a generic
// abstract illustration. Purely presentational (aria-hidden), so it never
// competes with the real page copy for screen readers.
export function ProductVisual() {
  return (
    <div
      aria-hidden="true"
      className="flex w-full max-w-sm flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm sm:max-w-none"
    >
      {STAGES.map((stage, i) => (
        <div key={stage.title}>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <stage.icon className="size-4" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{stage.title}</p>
                {stage.badge && <Badge variant={stage.badge.variant}>{stage.badge.label}</Badge>}
              </div>
              <p className="truncate text-xs text-muted-foreground sm:whitespace-normal">{stage.detail}</p>
            </div>
          </div>
          {i < STAGES.length - 1 && (
            <div className="flex justify-center py-1">
              <ArrowDown className="size-3.5 text-muted-foreground/50" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
