"use client";

import { useActionState } from "react";
import { createQuotationAction, type ActionState } from "@/server/actions/quotations";
import { Button } from "@/components/ui/button";

export function CreateQuotationForm({ projectId }: { projectId: string }) {
  const action = createQuotationAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create quotation"}
        </Button>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
