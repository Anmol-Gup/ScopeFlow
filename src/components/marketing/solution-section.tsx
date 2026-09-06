const WORKFLOW_STEPS = [
  "Capture requirements",
  "Generate proposal with AI",
  "Send proposal to client",
  "Handle change requests",
  "Create proposal revisions",
  "Get proposal accepted",
  "Create quotation",
  "Get quotation accepted",
  "Start project",
];

export function SolutionSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          One workflow from requirement to project.
        </h2>
        <p className="mt-3 text-muted-foreground">
          ScopeFlow keeps every step connected — the same requirements that shaped the proposal
          carry through to the quotation and the project.
        </p>
      </div>
      <ol className="mt-12 flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
        {WORKFLOW_STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium whitespace-nowrap">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              {step}
            </span>
            {i < WORKFLOW_STEPS.length - 1 && (
              <span aria-hidden="true" className="text-muted-foreground/50">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
