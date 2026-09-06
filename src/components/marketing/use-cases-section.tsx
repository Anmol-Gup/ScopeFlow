const USE_CASES = [
  {
    title: "Software development agencies",
    detail:
      "A client sends requirements over WhatsApp. Paste them into a project in ScopeFlow, and AI drafts the proposal. When the client asks for changes, the sales rep updates the requirements and generates the next version — then creates the quotation once it's accepted.",
  },
  {
    title: "Web development agencies",
    detail:
      "Requirements for a new site — pages, integrations, CMS, timeline — often arrive as a mix of email and a shared document. ScopeFlow turns that into one proposal with a clear scope of work, so nothing agreed on in conversation gets left out of what's billed.",
  },
  {
    title: "Freelancers",
    detail:
      "Working solo means proposals and quotes usually get rebuilt from the last one, by hand. ScopeFlow keeps a real record per client and per project, so a returning client's second project starts from its own clean requirements — not last year's file.",
  },
  {
    title: "IT consultants",
    detail:
      "Consulting engagements often start with a scoping call and a long list of technical requirements. Paste the notes in, let AI structure the proposal, and keep the quotation tied to exactly what was scoped — useful when requirements shift mid-engagement.",
  },
  {
    title: "Digital agencies",
    detail:
      "Agencies juggling design, marketing, and development work for the same client can give each engagement its own Project — separate requirements and pricing, without losing sight of the fact that it's all one client relationship.",
  },
  {
    title: "Small service businesses",
    detail:
      "Any business that quotes custom work — from a request to a priced proposal — benefits from having that process live in one place instead of split across a notebook, a spreadsheet, and a messaging app.",
  },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="scroll-mt-16 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Who ScopeFlow is built for
        </h2>
        <p className="mt-3 text-muted-foreground">
          Any team that turns client requirements into a priced, agreed scope of work.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map((useCase) => (
          <div key={useCase.title} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">{useCase.title}</h3>
            <p className="text-sm text-muted-foreground">{useCase.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
