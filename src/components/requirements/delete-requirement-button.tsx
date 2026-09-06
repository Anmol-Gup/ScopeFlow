"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteRequirementAction, type ActionState } from "@/server/actions/requirements";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DeleteRequirementButton({
  requirementId,
  locked,
}: {
  requirementId: string;
  locked?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    deleteRequirementAction,
    undefined
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (locked) {
    return (
      <Tooltip>
        {/* Disabled buttons get pointer-events:none, so the trigger goes on
            this wrapping span instead — otherwise hover never reaches it. */}
        <TooltipTrigger
          render={
            <span className="inline-flex">
              <Button variant="ghost" size="icon-sm" disabled>
                <Trash2 />
              </Button>
            </span>
          }
        />
        <TooltipContent>
          Already part of a locked scope version — mark it Rejected instead.
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="requirementId" value={requirementId} />
      <Button type="submit" variant="ghost" size="icon-sm" disabled={pending}>
        <Trash2 />
      </Button>
    </form>
  );
}
