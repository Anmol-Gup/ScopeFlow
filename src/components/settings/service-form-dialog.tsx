"use client";

import { useActionState, useState } from "react";
import { createServiceAction, updateServiceAction, type ActionState } from "@/server/actions/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export type ServiceDefaults = {
  name: string;
  description: string;
  defaultPrice: string;
  unit: string;
};

const EMPTY_DEFAULTS: ServiceDefaults = { name: "", description: "", defaultPrice: "", unit: "" };

type Props =
  | { mode: "create"; trigger: DialogFormTrigger }
  | { mode: "edit"; serviceId: string; defaults: ServiceDefaults; trigger: DialogFormTrigger };

export function ServiceFormDialog(props: Props) {
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
    props.mode === "create" ? createServiceAction : updateServiceAction.bind(null, props.serviceId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const defaults = formDefaults;

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Add service" : "Edit service"}</DialogTitle>
          <DialogDescription>
            A reusable starting price — every quotation can still override it.
          </DialogDescription>
        </DialogHeader>
        <form key={openGeneration} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={defaults.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="defaultPrice">Default price (₹) *</Label>
            <Input
              id="defaultPrice"
              name="defaultPrice"
              type="number"
              min="0"
              step="1"
              defaultValue={defaults.defaultPrice}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="unit">Unit (optional)</Label>
            <Input id="unit" name="unit" placeholder="e.g. per page, per month" defaultValue={defaults.unit} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={defaults.description} />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : props.mode === "create" ? "Add service" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
