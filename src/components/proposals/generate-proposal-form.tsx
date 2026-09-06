"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { generateProposalAction, type ActionState } from "@/server/actions/proposals";
import { Button } from "@/components/ui/button";

// Only ever rendered before a proposal's first version exists — once one
// does, "Revise with AI" (a guided instruction -> preview -> confirm flow)
// takes over as the only way to change it, whether draft, sent, viewed, or
// rejected. Blind regeneration of an existing proposal is blocked server-side.
export function GenerateProposalForm({ projectId }: { projectId: string }) {
  const action = generateProposalAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <Button type="submit" variant="ai" loading={pending}>
          {!pending && <Sparkles />}
          Generate proposal
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
