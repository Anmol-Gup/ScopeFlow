const FAQS = [
  {
    question: "What is ScopeFlow?",
    answer:
      "ScopeFlow is a workflow tool for agencies and service businesses that turns client requirements into professional proposals, manages client revisions, creates quotations, and moves accepted work into projects — all in one connected system.",
  },
  {
    question: "What is an AI proposal generator?",
    answer:
      "An AI proposal generator takes a description of what a client needs and drafts a structured proposal document from it — an executive summary, scope of work, deliverables, timeline, and pricing basis — instead of you writing it from scratch each time.",
  },
  {
    question: "How does ScopeFlow generate proposals?",
    answer:
      "You add a project's requirements — pasted from a client message, email, brief, or entered manually — and approve the set you want to use. ScopeFlow's AI then drafts a proposal from that approved scope, which you review and edit before sending.",
  },
  {
    question: "Can I create a proposal from client requirements?",
    answer:
      "Yes — that's the core of how ScopeFlow works. Requirements are the starting point for every proposal, and the proposal stays traceable back to the specific requirements it was generated from.",
  },
  {
    question: "Can clients request changes to a proposal?",
    answer:
      "Yes. Clients review proposals through a secure public link and can either accept the proposal or request changes. A change request is recorded and shown to the sales rep on the proposal, the project, and the dashboard, so it's never missed.",
  },
  {
    question: "Does ScopeFlow support proposal versions?",
    answer:
      "Yes. Every time a proposal is regenerated in response to feedback, it's saved as a new version (V1, V2, V3, and so on) rather than overwriting the previous one, so you keep a full history of what changed and why.",
  },
  {
    question: "Can one client have multiple projects?",
    answer:
      "Yes. In ScopeFlow, a Lead represents the client or company, and a Lead can have multiple independent Projects. Each Project has its own requirements, proposal versions, and quotation — nothing is shared or mixed between them.",
  },
  {
    question: "When can I create a quotation?",
    answer:
      "A quotation can only be created after its proposal has been accepted by the client. This keeps pricing tied to a scope that's actually been agreed on, rather than a draft that might still change.",
  },
  {
    question: "Can I customize proposals and quotations with my company logo?",
    answer:
      "Yes. You can configure your company logo, contact details, tax/GST number, accent color, default payment terms, and terms & conditions once in Settings, and they apply automatically to every proposal and quotation you generate.",
  },
  {
    question: "Is ScopeFlow a CRM?",
    answer:
      "No. ScopeFlow isn't a general-purpose CRM or project-management tool — it's focused specifically on the workflow between a client's requirements and a project starting: requirements, proposal, revisions, acceptance, quotation, and project handoff.",
  },
  {
    question: "Who is ScopeFlow for?",
    answer:
      "Software and web development agencies, freelancers, IT consultants, digital agencies, and small service businesses that turn client requirements into priced proposals and need to keep that process organized as it happens.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-16 mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Frequently asked questions
        </h2>
      </div>
      <div className="mt-10 flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {FAQS.map((faq) => (
          <details key={faq.question} className="group px-5 py-4 open:pb-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium marker:content-none">
              {faq.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-lg text-muted-foreground transition-transform duration-150 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
