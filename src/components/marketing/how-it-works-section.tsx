import { ClipboardList, Sparkles, Users, Receipt, Rocket } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Add client requirements",
    detail:
      "Paste whatever you already have — a WhatsApp message, an email thread, a project brief, or notes from a call. There's no need to reformat it first; ScopeFlow keeps the original text on file and works from there.",
  },
  {
    icon: Sparkles,
    title: "Generate a proposal",
    detail:
      "AI reads the approved requirements for that project and drafts a structured proposal — executive summary, scope of work, deliverables, technology, timeline, and pricing basis — ready for you to review and edit.",
  },
  {
    icon: Users,
    title: "Collaborate with the client",
    detail:
      "Share a secure link. The client reviews the proposal and either accepts it or requests changes — and every request is recorded and visible to the sales rep, never lost in a side conversation.",
  },
  {
    icon: Receipt,
    title: "Finalize the quotation",
    detail:
      "Once the client accepts the proposal, create the quotation from the same approved scope — line items, tax, and totals, fully editable and never calculated by AI.",
  },
  {
    icon: Rocket,
    title: "Start the project",
    detail:
      "When the client accepts the quotation, the project moves into delivery automatically — still linked back to the exact requirements and proposal it was scoped from.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-accent/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            How ScopeFlow works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Five steps, from a client&apos;s first message to a project in delivery.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-4.5" aria-hidden="true" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
