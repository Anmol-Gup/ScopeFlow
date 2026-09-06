"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createProjectAction, type ActionState } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogTriggerButton } from "@/components/ui/dialog-trigger-button";

export function CreateProjectDialog({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const action = createProjectAction.bind(null, leadId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerButton size="sm">
        <Plus />
        New Project
      </DialogTriggerButton>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            A project is a specific engagement for this client — it gets its own requirements,
            proposal, and quotation.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" name="name" placeholder="e.g. E-commerce Website" required />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
