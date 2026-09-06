"use client";

import { useActionState } from "react";
import {
  suggestNegotiationAction,
  type SuggestNegotiationState,
} from "@/server/actions/quotations";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  REMOVE: "Remove",
  REDUCE_QUANTITY: "Reduce quantity",
  DEFER_TO_PHASE_2: "Move to Phase 2",
  OTHER: "Consider",
};

export function SuggestNegotiationForm({
  quotationId,
  defaultTargetBudget,
}: {
  quotationId: string;
  defaultTargetBudget: string;
}) {
  const action = suggestNegotiationAction.bind(null, quotationId);
  const [state, formAction, pending] = useActionState<SuggestNegotiationState, FormData>(
    action,
    undefined
  );

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-2">
          <Label className="text-xs">Client&apos;s target budget (optional)</Label>
          <Input
            name="targetBudget"
            type="number"
            min="0"
            step="1"
            defaultValue={defaultTargetBudget}
            className="w-40"
          />
        </div>
        <Button type="submit" variant="ai" loading={pending}>
          {!pending && <Sparkles />}
          Suggest negotiation options
        </Button>
      </form>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      {state?.data && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Badge variant="ai">AI Generated</Badge>
            <p className="text-sm">{state.data.summary}</p>
          </div>
          {state.data.suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No suggestions matched an existing line item.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {state.data.suggestions.map((s, i) => (
                <li key={i} className="rounded-lg border p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="outline">{ACTION_LABELS[s.action] ?? s.action}</Badge>
                    <span className="font-medium">{s.itemDescription}</span>
                    {s.suggestedQuantity !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        → qty {s.suggestedQuantity}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground">{s.rationale}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm font-medium">
            Estimated reduction if all applied: {formatCurrency(state.data.totalEstimatedSavings)}
          </p>
          <p className="text-xs text-muted-foreground">
            You decide what to apply — nothing here has changed the quotation yet.
          </p>
        </div>
      )}
    </div>
  );
}
