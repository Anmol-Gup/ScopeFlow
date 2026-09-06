"use client";

import { useActionState, useState } from "react";
import {
  createRequirementAction,
  updateRequirementAction,
  type ActionState,
} from "@/server/actions/requirements";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogTriggerButton, type DialogFormTrigger } from "@/components/ui/dialog-trigger-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REQUIREMENT_STATUSES, requirementStatusLabel } from "@/lib/requirements/constants";

export type RequirementDefaults = {
  category: string;
  requirement: string;
  status: string;
  priority: string;
  confidence: string;
  evidence: string;
  notes: string;
};

const EMPTY_DEFAULTS: RequirementDefaults = {
  category: "FUNCTIONAL",
  requirement: "",
  status: "PENDING_APPROVAL",
  priority: "MEDIUM",
  confidence: "MEDIUM",
  evidence: "",
  notes: "",
};

type Props =
  | { mode: "create"; projectId: string; trigger: DialogFormTrigger }
  | {
      mode: "edit";
      requirementId: string;
      defaults: RequirementDefaults;
      trigger: DialogFormTrigger;
      contentLocked?: boolean;
    };

export function RequirementFormDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const liveDefaults = props.mode === "edit" ? props.defaults : EMPTY_DEFAULTS;
  // Base UI keeps dialog content mounted (hidden, not unmounted) between
  // opens, so its Inputs stay alive with their original defaultValue. If the
  // row's data changes while the form is still technically mounted — e.g.
  // revalidation right after this same dialog's own save reflects the new
  // value back down — the live `defaults` prop would change under a mounted
  // uncontrolled input. Snapshotting defaults only at the moment of opening
  // (and remounting the form with that snapshot) means the mounted form
  // never sees a defaultValue change after its own initialization.
  const [formDefaults, setFormDefaults] = useState(liveDefaults);
  const [openGeneration, setOpenGeneration] = useState(0);
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setFormDefaults(liveDefaults);
      setOpenGeneration((g) => g + 1);
    }
  }
  const action =
    props.mode === "create"
      ? createRequirementAction.bind(null, props.projectId)
      : updateRequirementAction.bind(null, props.requirementId);
  const contentLocked = props.mode === "edit" && props.contentLocked;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const defaults = formDefaults;

  // Close the dialog once the action succeeds. Adjusting state during render
  // (rather than in a useEffect) avoids an extra cascading render.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.message) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTriggerButton variant={props.trigger.variant} size={props.trigger.size}>
        {props.trigger.content}
      </DialogTriggerButton>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Add requirement" : "Edit requirement"}</DialogTitle>
          <DialogDescription>
            {props.mode === "create"
              ? "Manually add a requirement the client mentioned."
              : "Update this requirement's details."}
          </DialogDescription>
        </DialogHeader>
        <form key={openGeneration} action={formAction} className="flex flex-col gap-4">
          {/* Category, Priority, and Confidence aren't user-facing here — AI-
              imported requirements already have real values from the
              analysis output, and asking a human to pick them by hand for
              every manual add or edit was just friction. Carry whatever
              values this requirement already has (or the sensible defaults
              for a new one) through unchanged. */}
          <input type="hidden" name="category" value={defaults.category} />
          <input type="hidden" name="priority" value={defaults.priority} />
          <input type="hidden" name="confidence" value={defaults.confidence} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={defaults.status}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue>
                  {(v: string | null) => (v ? requirementStatusLabel(v) : "Status")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {REQUIREMENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="requirement">Requirement *</Label>
            <Textarea
              id="requirement"
              name="requirement"
              rows={3}
              defaultValue={defaults.requirement}
              required
              readOnly={contentLocked}
              aria-readonly={contentLocked}
              className={contentLocked ? "bg-muted text-muted-foreground" : undefined}
            />
            {contentLocked && (
              <p className="text-xs text-muted-foreground">
                Already part of a proposal — its text can&apos;t be changed here. Mark it Rejected and
                add a new requirement instead, or use &ldquo;Revise with AI&rdquo; on the proposal.
              </p>
            )}
          </div>
          {/* Evidence and Notes are dropped from manual entry too — neither
              is used anywhere downstream (not in the proposal-generation
              prompt, not on any document), so they were just extra fields
              to fill in for no functional benefit. */}
          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : props.mode === "create" ? "Add requirement" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
