"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { generateAdditionalProposalAction, type ActionState } from "@/server/actions/proposals";
import { Button } from "@/components/ui/button";

export function GenerateAdditionalProposalForm({ projectId }: { projectId: string }) {
  const action = generateAdditionalProposalAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <Button type="submit" variant="ai" loading={pending}>
          {!pending && <Sparkles />}
          Generate Additional Proposal
        </Button>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
    </form>
  );
}
