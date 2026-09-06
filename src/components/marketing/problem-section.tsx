import { MessageSquareText, FileEdit, GitBranch, Layers, Receipt, FolderKanban, Puzzle } from "lucide-react";

const PROBLEMS = [
  {
    icon: MessageSquareText,
    title: "Requirements are scattered across messages",
    detail:
      "Client requirements arrive over WhatsApp, email, calls, and shared documents — and stay there, disconnected from the work they describe.",
  },
  {
    icon: FileEdit,
    title: "Proposals are created manually",
    detail:
      "Every proposal starts from a blank document, copied from the last one and edited by hand while the original requirements sit in another tab.",
  },
  {
    icon: GitBranch,
    title: "Client changes are difficult to track",
    detail:
      "A client asks for a change over email or a call, and it's easy for that request to get lost before it ever reaches the next draft.",
  },
  {
    icon: Layers,
    title: "Proposal versions get confusing",
    detail:
      "\"Proposal_final_v3_reallyfinal.docx\" — without real version history, it's hard to know which draft the client actually saw last.",
  },
  {
    icon: Receipt,
    title: "Quotations are disconnected from scope",
    detail:
      "Pricing gets built in a separate spreadsheet, with no reliable link back to the requirements or proposal it's supposed to reflect.",
  },
  {
    icon: FolderKanban,
    title: "Multiple projects per client get tangled",
    detail:
      "When one client comes back for a second or third project, their requirements, proposals, and quotations start blending together.",
  },
  {
    icon: Puzzle,
    title: "Sales and delivery become fragmented",
    detail:
      "By the time a deal is won, the context that shaped it is spread across inboxes and folders instead of moving into the project.",
  },
];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Your sales process shouldn&apos;t live across WhatsApp, email, and spreadsheets.
        </h2>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <div key={problem.title} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <problem.icon className="size-5 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold">{problem.title}</h3>
            <p className="text-sm text-muted-foreground">{problem.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
