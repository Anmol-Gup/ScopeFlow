export function ProposalVsQuotationSection() {
  return (
    <section id="proposal-vs-quotation" className="scroll-mt-16 bg-accent/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Proposal vs. quotation — what&apos;s the difference?
          </h2>
          <p className="mt-3 text-muted-foreground">
            The two are related but answer different questions, and ScopeFlow keeps them
            connected instead of treating them as separate documents.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">Proposal</h3>
            <p className="text-sm font-medium text-primary">
              &ldquo;What we will build and how we will deliver it.&rdquo;
            </p>
            <p className="text-sm text-muted-foreground">
              A proposal explains the approach: the scope of work, deliverables, technology,
              timeline, and how the engagement will run. In ScopeFlow, it&apos;s generated from
              the requirements you&apos;ve approved for a project, and it stays versioned as the
              client requests changes.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">Quotation</h3>
            <p className="text-sm font-medium text-primary">&ldquo;What it will cost.&rdquo;</p>
            <p className="text-sm text-muted-foreground">
              A quotation is the priced version of that same scope — line items, tax, and totals.
              ScopeFlow only allows a quotation to be created once its proposal has been accepted,
              so pricing is never disconnected from what was actually agreed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
