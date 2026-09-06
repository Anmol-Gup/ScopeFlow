import {
  Sparkles,
  GitBranch,
  MessageCircleWarning,
  ListChecks,
  Receipt,
  FolderKanban,
  Building2,
  Palette,
  Link2,
} from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Proposal Generation",
    detail: "Turn raw client requirements into a structured, professional proposal draft.",
  },
  {
    icon: GitBranch,
    title: "Proposal Versioning",
    detail: "Every regeneration keeps V1, V2, V3 as real history — never overwritten, never lost.",
  },
  {
    icon: MessageCircleWarning,
    title: "Client Change Requests",
    detail: "Clients can request changes on the public proposal page, visible to the sales rep immediately.",
  },
  {
    icon: ListChecks,
    title: "Requirements Management",
    detail: "Approve a specific set of requirements and keep the proposal traceable back to that scope.",
  },
  {
    icon: Receipt,
    title: "Quotation Management",
    detail: "Create a quotation only once the proposal is accepted — pricing that's always tied to real scope.",
  },
  {
    icon: FolderKanban,
    title: "Project Management",
    detail: "Move accepted work straight into project execution, with its scope and pricing already attached.",
  },
  {
    icon: Building2,
    title: "Multi-Project Leads",
    detail: "One client can have several independent projects, each with its own requirements and documents.",
  },
  {
    icon: Palette,
    title: "Branded Documents",
    detail: "Your logo, company details, accent color, and payment terms — on every proposal and quotation.",
  },
  {
    icon: Link2,
    title: "Client-Facing Links",
    detail: "Clients review and respond to proposals and quotations through a secure link — no login required.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-16 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Everything a proposal workflow needs
        </h2>
        <p className="mt-3 text-muted-foreground">
          Built specifically around requirements, proposals, quotations, and projects — not a
          generic CRM stretched to fit.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <feature.icon className="size-5 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
