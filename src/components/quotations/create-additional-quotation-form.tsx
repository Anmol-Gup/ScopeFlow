"use client";

import { useActionState } from "react";
import { createAdditionalQuotationAction, type ActionState } from "@/server/actions/quotations";
import { Button } from "@/components/ui/button";

export function CreateAdditionalQuotationForm({
  projectId,
  proposalId,
}: {
  projectId: string;
  proposalId: string;
}) {
  const action = createAdditionalQuotationAction.bind(null, projectId, proposalId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Creating…" : "Create Quotation"}
      </Button>
      {state?.error && (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
