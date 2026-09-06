"use client";

import { useState, useTransition } from "react";
import { Sparkles, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DialogTriggerButton } from "@/components/ui/dialog-trigger-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  previewProposalRevisionAction,
  confirmProposalRevisionAction,
  type ProposalRevisionPreview,
} from "@/server/actions/proposals";
import { requirementCategoryLabel, priorityLabel } from "@/lib/requirements/constants";

// Revising a REJECTED proposal is a two-step, explicit-confirm flow — never
// a blind regenerate. Step 1 (below) only ever calls the preview action,
// which writes nothing; step 2 sends that exact preview back to the confirm
// action, which is what actually creates Requirement changes and the new
// ProposalVersion. Nothing is persisted between the two calls except in the
// browser's own component state.
export function ReviseProposalForm({ proposalId }: { proposalId: string }) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [preview, setPreview] = useState<ProposalRevisionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [isConfirming, startConfirm] = useTransition();

  function reset() {
    setInstruction("");
    setPreview(null);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleGeneratePreview() {
    setError(null);
    startPreview(async () => {
      const result = await previewProposalRevisionAction(proposalId, instruction);
      if (result?.error) setError(result.error);
      else if (result?.preview) setPreview(result.preview);
    });
  }

  function handleConfirm() {
    if (!preview) return;
    setError(null);
    startConfirm(async () => {
      const result = await confirmProposalRevisionAction(proposalId, preview);
      if (result?.error) {
        setError(result.error);
      } else if (result?.message) {
        toast.success(result.message);
        setOpen(false);
        reset();
      }
    });
  }

  const hasChanges = preview
    ? preview.requirementsToRemove.length > 0 || preview.requirementsToAdd.length > 0
    : false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTriggerButton variant="ai">
        <Sparkles />
        Revise with AI
      </DialogTriggerButton>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revise with AI</DialogTitle>
          <DialogDescription>
            {preview
              ? "Review what will change before generating the new version. Nothing is saved yet."
              : "The rejected version stays exactly as it was — this creates an independent new version."}
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="revision-instruction">What would you like to change?</Label>
              <Textarea
                id="revision-instruction"
                rows={4}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. Remove the admin dashboard, add inventory management, and make the proposal more concise."
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="ai"
                loading={isPreviewing}
                disabled={!instruction.trim()}
                onClick={handleGeneratePreview}
              >
                {!isPreviewing && <Sparkles />}
                Generate revised proposal
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm">{preview.summary}</p>
            {hasChanges ? (
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">Scope changes</p>
                {preview.requirementsToRemove.map((r) => (
                  <div key={r.id} className="flex items-start gap-2 text-sm">
                    <Minus className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    <span className="text-muted-foreground line-through">{r.requirement}</span>
                  </div>
                ))}
                {preview.requirementsToAdd.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Plus className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span className="flex flex-wrap items-center gap-1.5">
                      {r.requirement}
                      <Badge variant="outline">{requirementCategoryLabel(r.category)}</Badge>
                      <Badge variant="outline">{priorityLabel(r.priority)}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No scope changes — this only updates the proposal&apos;s wording, not the approved
                requirements.
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={reset}>
                Start over
              </Button>
              <Button type="button" variant="ai" loading={isConfirming} onClick={handleConfirm}>
                {!isConfirming && <Sparkles />}
                Confirm &amp; generate proposal
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
