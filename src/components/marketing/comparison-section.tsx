const TRADITIONAL_TOOLS = ["WhatsApp", "Email", "Word / Google Docs", "Spreadsheet", "PDF", "Manual follow-ups"];
const SCOPEFLOW_STEPS = ["Requirements", "Proposal", "Revisions", "Acceptance", "Quotation", "Project"];

export function ComparisonSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Where ScopeFlow fits
        </h2>
        <p className="mt-3 text-muted-foreground">
          ScopeFlow isn&apos;t a CRM or a project-management tool — it&apos;s the specific
          workflow between a client&apos;s requirements and a project starting.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">The traditional way</p>
          <div className="flex flex-wrap gap-2">
            {TRADITIONAL_TOOLS.map((tool) => (
              <span
                key={tool}
                className="rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground"
              >
                {tool}
              </span>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Each tool handles one piece, stitched together by hand and by memory.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-sm font-medium text-primary">With ScopeFlow</p>
          <div className="flex flex-wrap items-center gap-2">
            {SCOPEFLOW_STEPS.map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-primary/30 bg-background px-3 py-1 text-sm font-medium">
                  {step}
                </span>
                {i < SCOPEFLOW_STEPS.length - 1 && (
                  <span aria-hidden="true" className="text-primary/50">
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            One connected workflow, from the first requirement to the project.
          </p>
        </div>
      </div>
    </section>
  );
}
