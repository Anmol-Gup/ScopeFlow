"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogTriggerButton, type DialogFormTrigger } from "@/components/ui/dialog-trigger-button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/combobox";

type LeadOption = {
  id: string;
  name: string;
  company: string | null;
  // `eligible` defaults to true when omitted — callers with no eligibility
  // concept (e.g. the Proposals picker) can skip it entirely. A project
  // passed as ineligible still shows in the list (disabled, with a reason)
  // rather than silently vanishing — the silent-omission version of this is
  // exactly what let someone pick the only visible project without
  // realizing it wasn't the one they meant to work on.
  projects: { id: string; name: string; eligible?: boolean; ineligibleReason?: string }[];
};

// Two cascading selects (Lead, then that Lead's Projects) used by the
// global Requirements/Proposals/Quotations pages' "+ Create" flows. Rather
// than duplicating the full creation UI (AI provider pickers, requirement
// fields, etc.) inside a dialog, this just resolves which Project the user
// means, then hands off to the existing project-scoped page that already
// has the real creation UI — reusing it instead of rebuilding it.
export function LeadProjectPickerDialog({
  leads,
  trigger,
  title,
  description,
  continueLabel = "Continue",
  destinationSuffix,
  emptyProjectsHint,
}: {
  leads: LeadOption[];
  trigger: DialogFormTrigger;
  title: string;
  description: string;
  continueLabel?: string;
  // Appended to `/projects/{projectId}` to build the destination URL — a
  // plain string (not a function) so this Client Component can receive it
  // directly from a Server Component page without a serialization error.
  destinationSuffix: string;
  emptyProjectsHint: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // "" (never undefined) so the Select is controlled from its first render —
  // Base UI warns if a Select switches from uncontrolled to controlled.
  const [leadId, setLeadId] = useState("");
  const [projectId, setProjectId] = useState("");

  const selectedLead = leads.find((l) => l.id === leadId);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setLeadId("");
      setProjectId("");
    }
  }

  function handleContinue() {
    if (!projectId) return;
    setOpen(false);
    router.push(`/projects/${projectId}${destinationSuffix}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTriggerButton variant={trigger.variant} size={trigger.size}>
        {trigger.content}
      </DialogTriggerButton>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="picker-lead">Lead</Label>
            <SearchableSelect
              id="picker-lead"
              placeholder="Search leads..."
              value={leadId}
              onValueChange={(next) => {
                setLeadId(next ?? "");
                setProjectId("");
              }}
              items={leads.map((l) => ({
                value: l.id,
                label: `${l.name}${l.company ? ` (${l.company})` : ""}`,
              }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="picker-project">Project</Label>
            <SearchableSelect
              id="picker-project"
              placeholder="Search projects..."
              value={projectId}
              onValueChange={(next) => setProjectId(next ?? "")}
              disabled={!selectedLead || selectedLead.projects.length === 0}
              items={
                selectedLead?.projects.map((p) => ({
                  value: p.id,
                  label: p.name,
                  disabled: p.eligible === false,
                  description: p.ineligibleReason,
                })) ?? []
              }
            />
            {selectedLead && selectedLead.projects.length === 0 && (
              <p className="text-xs text-muted-foreground">{emptyProjectsHint}</p>
            )}
            {selectedLead &&
              selectedLead.projects.length > 0 &&
              selectedLead.projects.every((p) => p.eligible === false) && (
                <p className="text-xs text-muted-foreground">{emptyProjectsHint}</p>
              )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleContinue} disabled={!projectId}>
            {continueLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
