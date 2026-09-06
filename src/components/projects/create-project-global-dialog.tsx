"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createProjectAction, type ActionState } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogTriggerButton } from "@/components/ui/dialog-trigger-button";

type LeadOption = { id: string; name: string; company: string | null };

// Same as CreateProjectDialog, but for use outside a lead's own page —
// the user picks which Lead the new Project belongs to first.
export function CreateProjectGlobalDialog({ leads }: { leads: LeadOption[] }) {
  const [open, setOpen] = useState(false);
  // "" (never undefined) so the Select is controlled from its first render —
  // Base UI warns if a Select switches from uncontrolled to controlled.
  const [leadId, setLeadId] = useState("");
  const action = createProjectAction.bind(null, leadId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setLeadId("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTriggerButton size="sm">
        <Plus />
        New Project
      </DialogTriggerButton>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            A project is a specific engagement for a client — it gets its own requirements,
            proposal, and quotation.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="global-project-lead">Lead</Label>
            <SearchableSelect
              id="global-project-lead"
              placeholder="Search leads..."
              value={leadId}
              onValueChange={(next) => setLeadId(next ?? "")}
              items={leads.map((l) => ({
                value: l.id,
                label: `${l.name}${l.company ? ` (${l.company})` : ""}`,
              }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="global-project-name">Project name</Label>
            <Input id="global-project-name" name="name" placeholder="e.g. E-commerce Website" required />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending || !leadId}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
