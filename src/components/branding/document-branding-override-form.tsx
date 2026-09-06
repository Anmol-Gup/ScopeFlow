"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/server/actions/branding";

// Optional per-document override of the workspace's branding defaults —
// leaving a field blank keeps using the workspace default (see lib/branding.ts).
// Shared by the Proposal and Quotation pages; the caller supplies which
// server action to bind (updateProposalBrandingAction / updateQuotationBrandingAction).
export function DocumentBrandingOverrideForm({
  action,
  defaultAccentColor,
  defaultTermsAndConditions,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultAccentColor: string | null;
  defaultTermsAndConditions: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.message) toast.success(state.message);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    // Keyed on the current values so a successful save (which revalidates
    // and re-renders this same mounted component with fresh server props)
    // remounts the form and resets its uncontrolled fields' defaultValue,
    // instead of leaving them stale.
    <form
      key={`${defaultAccentColor ?? ""}:${defaultTermsAndConditions ?? ""}`}
      action={formAction}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="override-accentColor">Accent color</Label>
          <Input
            id="override-accentColor"
            name="accentColor"
            defaultValue={defaultAccentColor ?? ""}
            placeholder="Use workspace default"
            maxLength={7}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="override-terms">Terms &amp; conditions</Label>
        <Textarea
          id="override-terms"
          name="termsAndConditions"
          rows={3}
          defaultValue={defaultTermsAndConditions ?? ""}
          placeholder="Use workspace default"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
