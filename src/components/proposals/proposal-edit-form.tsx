"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import {
  updateProposalContentAction,
  reviseProposalManuallyAction,
  type ActionState,
} from "@/server/actions/proposals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProposalContent } from "@/lib/ai/schemas";

export function ProposalEditForm({
  proposalId,
  content,
  cancelHref,
  isRejected,
}: {
  proposalId: string;
  content: ProposalContent;
  cancelHref: string;
  // A rejected version is immutable — saving here must create a new
  // version rather than editing the rejected one in place.
  isRejected?: boolean;
}) {
  const action = (isRejected ? reviseProposalManuallyAction : updateProposalContentAction).bind(
    null,
    proposalId
  );
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [isDirty, setIsDirty] = useState(false);

  const initialValues = useMemo(
    () => ({
      coverTitle: content.coverTitle,
      executiveSummary: content.executiveSummary,
      businessUnderstanding: content.businessUnderstanding,
      proposedSolution: content.proposedSolution,
      timeline: content.timeline,
      supportWarranty: content.supportWarranty,
      paymentTerms: content.paymentTerms,
      scopeOfWork: content.scopeOfWork.join("\n"),
      deliverables: content.deliverables.join("\n"),
      technologyStack: content.technologyStack.join("\n"),
      assumptions: content.assumptions.join("\n"),
      outOfScope: content.outOfScope.join("\n"),
      nextSteps: content.nextSteps.join("\n"),
    }),
    [content]
  );

  // Delegated onInput on the form (rather than controlled state per field)
  // — every field below stays a plain uncontrolled input, this just
  // compares the live FormData against what was originally loaded.
  function checkDirty() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const changed = Object.entries(initialValues).some(
      ([key, original]) => (data.get(key) ?? "") !== original
    );
    setIsDirty(changed);
  }

  return (
    <form ref={formRef} action={formAction} onInput={checkDirty} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cover</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="coverTitle">Title *</Label>
            <Input id="coverTitle" name="coverTitle" defaultValue={content.coverTitle} required />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Narrative sections</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="executiveSummary">Executive summary</Label>
            <Textarea
              id="executiveSummary"
              name="executiveSummary"
              rows={4}
              defaultValue={content.executiveSummary}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="businessUnderstanding">Business understanding</Label>
            <Textarea
              id="businessUnderstanding"
              name="businessUnderstanding"
              rows={4}
              defaultValue={content.businessUnderstanding}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="proposedSolution">Proposed solution</Label>
            <Textarea
              id="proposedSolution"
              name="proposedSolution"
              rows={4}
              defaultValue={content.proposedSolution}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="timeline">Timeline</Label>
            <Textarea id="timeline" name="timeline" rows={3} defaultValue={content.timeline} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="supportWarranty">Support / warranty</Label>
            <Textarea
              id="supportWarranty"
              name="supportWarranty"
              rows={3}
              defaultValue={content.supportWarranty}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="paymentTerms">Payment terms</Label>
            <Textarea
              id="paymentTerms"
              name="paymentTerms"
              rows={3}
              defaultValue={content.paymentTerms}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lists</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">One item per line.</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="scopeOfWork">Scope of work</Label>
            <Textarea
              id="scopeOfWork"
              name="scopeOfWork"
              rows={4}
              defaultValue={content.scopeOfWork.join("\n")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="deliverables">Deliverables</Label>
            <Textarea
              id="deliverables"
              name="deliverables"
              rows={4}
              defaultValue={content.deliverables.join("\n")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="technologyStack">Technology stack</Label>
            <Textarea
              id="technologyStack"
              name="technologyStack"
              rows={3}
              defaultValue={content.technologyStack.join("\n")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="assumptions">Assumptions</Label>
            <Textarea
              id="assumptions"
              name="assumptions"
              rows={3}
              defaultValue={content.assumptions.join("\n")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="outOfScope">Out of scope</Label>
            <Textarea
              id="outOfScope"
              name="outOfScope"
              rows={3}
              defaultValue={content.outOfScope.join("\n")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nextSteps">Next steps</Label>
            <Textarea
              id="nextSteps"
              name="nextSteps"
              rows={3}
              defaultValue={content.nextSteps.join("\n")}
            />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={cancelHref}>Cancel</Link>}
        />
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? "Saving…" : isRejected ? "Save as new version" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
