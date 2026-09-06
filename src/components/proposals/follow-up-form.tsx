"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { generateFollowUpAction, type FollowUpState } from "@/server/actions/proposals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy message"}
    </Button>
  );
}

export function FollowUpForm({ projectId }: { projectId: string }) {
  const action = generateFollowUpAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<FollowUpState, FormData>(action, undefined);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction}>
        <Button type="submit" variant="ai" loading={pending}>
          {!pending && <Sparkles />}
          Generate follow-up message
        </Button>
      </form>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      {state?.message && (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          <Badge variant="ai" className="w-fit">
            AI Generated
          </Badge>
          <Textarea readOnly rows={5} value={state.message} className="resize-none" />
          <div>
            <CopyMessageButton text={state.message} />
          </div>
          <p className="text-xs text-muted-foreground">
            Nothing is sent automatically — copy this and send it yourself.
          </p>
        </div>
      )}
    </div>
  );
}
