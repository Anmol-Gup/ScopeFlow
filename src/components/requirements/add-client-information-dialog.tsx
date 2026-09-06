"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DialogTriggerButton, type DialogFormTrigger } from "@/components/ui/dialog-trigger-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addRequirementAction,
  paraphraseRequirementAction,
  type ActionState,
} from "@/server/actions/client-information";

export function AddClientInformationDialog({
  projectId,
  hasAiProvider,
  trigger,
}: {
  projectId: string;
  hasAiProvider: boolean;
  trigger: DialogFormTrigger;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [paraphraseError, setParaphraseError] = useState<string | null>(null);
  const [isParaphrasing, startParaphrase] = useTransition();
  const action = addRequirementAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.message) toast.success(state.message);
  }, [state]);

  // Close and reset on success. Adjusting state during render (rather than
  // in a useEffect) avoids an extra cascading render.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.message) {
      setOpen(false);
      setContent("");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setContent("");
      setParaphraseError(null);
    }
  }

  function handleParaphrase() {
    setParaphraseError(null);
    startParaphrase(async () => {
      const result = await paraphraseRequirementAction(projectId, content);
      if (result.error) {
        setParaphraseError(result.error);
      } else if (result.requirement) {
        setContent(result.requirement);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTriggerButton variant={trigger.variant} size={trigger.size}>
        {trigger.content}
      </DialogTriggerButton>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Requirement</DialogTitle>
          <DialogDescription>
            Type or paste the requirement. AI can optionally clean up the wording — nothing is
            saved until you click Add.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="content">Requirement</Label>
            <Textarea
              id="content"
              name="content"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. Customer accounts with order history and saved addresses"
              required
            />
          </div>
          {hasAiProvider && (
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="ai"
                size="sm"
                className="w-fit"
                loading={isParaphrasing}
                onClick={handleParaphrase}
                disabled={!content.trim()}
              >
                {!isParaphrasing && <Sparkles />}
                Improve with AI
              </Button>
              {paraphraseError && (
                <p className="text-xs text-destructive" role="alert">
                  {paraphraseError}
                </p>
              )}
            </div>
          )}
          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {!pending && <Plus />}
              Add Requirement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
