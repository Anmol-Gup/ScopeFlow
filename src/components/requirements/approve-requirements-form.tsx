"use client";

import { useActionState } from "react";
import { approveRequirementsAction, type ActionState } from "@/server/actions/requirements";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ApproveRequirementsForm({
  projectId,
  disabled = false,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const action = approveRequirementsAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="changesSummary">What changed since the last version? (optional)</Label>
        <Textarea
          id="changesSummary"
          name="changesSummary"
          rows={2}
          placeholder="e.g. Confirmed payment provider, dropped coupon system"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
      <div>
        <Button type="submit" disabled={pending || disabled}>
          {pending ? "Locking…" : "Lock approved scope"}
        </Button>
      </div>
    </form>
  );
}
