import { Building2, FolderKanban } from "lucide-react";

const PROJECTS = [
  { name: "E-commerce Website", status: "In Progress" },
  { name: "Mobile App", status: "Proposal Sent" },
  { name: "CRM", status: "Scoping" },
];

export function DifferentiatorSection() {
  return (
    <section className="bg-accent/40 py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Built around the project, not just the client.
          </h2>
          <p className="text-muted-foreground">
            A single client relationship rarely stays a single deal. ScopeFlow treats a Lead as
            the client or company you&apos;re working with — and lets it have multiple,
            completely independent Projects.
          </p>
          <p className="text-muted-foreground">
            Each Project keeps its own requirements, proposal versions, quotation, and project
            status. Nothing from one project leaks into another, even when they belong to the
            same client.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 self-start rounded-lg border border-border bg-background px-3 py-2">
            <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-semibold">ABC Technologies</span>
            <span className="text-xs text-muted-foreground">— Lead</span>
          </div>
          <div className="flex w-full flex-col gap-2 border-l-2 border-dashed border-border pl-6">
            {PROJECTS.map((project) => (
              <div
                key={project.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <FolderKanban className="size-4 text-primary" aria-hidden="true" />
                  {project.name}
                </span>
                <span className="text-xs text-muted-foreground">{project.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
