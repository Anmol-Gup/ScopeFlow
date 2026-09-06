"use client";

import { useActionState, useState } from "react";
import {
  acceptProposalAction,
  requestProposalChangesAction,
  rejectProposalAction,
  type ActionState,
} from "@/server/actions/proposal-share";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "none" | "accept" | "changes" | "reject";

function AcceptForm({ token }: { token: string }) {
  const action = acceptProposalAction.bind(null, token);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  if (state?.message) {
    return <p className="text-sm text-muted-foreground">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        By accepting, you confirm you&apos;ve reviewed this proposal and would like to proceed.
        This records your name, email, and the time of acceptance — it is not a digital
        signature.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="accept-name">Your name</Label>
        <Input id="accept-name" name="name" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="accept-email">Your email</Label>
        <Input id="accept-email" name="email" type="email" required />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Confirm acceptance"}
        </Button>
      </div>
    </form>
  );
}

function ChangesForm({ token }: { token: string }) {
  const action = requestProposalChangesAction.bind(null, token);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  if (state?.message) {
    return <p className="text-sm text-muted-foreground">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="changes-message">What would you like changed?</Label>
        <Textarea id="changes-message" name="message" rows={4} required />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}

function RejectForm({ token }: { token: string }) {
  const action = rejectProposalAction.bind(null, token);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  if (state?.message) {
    return <p className="text-sm text-muted-foreground">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="reject-reason">Reason (optional)</Label>
        <Textarea id="reject-reason" name="reason" rows={3} />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Submitting…" : "Confirm rejection"}
        </Button>
      </div>
    </form>
  );
}

export function ProposalActions({ token }: { token: string }) {
  const [mode, setMode] = useState<Mode>("none");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your decision</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mode === "none" && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setMode("accept")}>Accept proposal</Button>
            <Button variant="outline" onClick={() => setMode("changes")}>
              Request changes
            </Button>
            <Button variant="ghost" onClick={() => setMode("reject")}>
              Reject
            </Button>
          </div>
        )}
        {mode === "accept" && <AcceptForm token={token} />}
        {mode === "changes" && <ChangesForm token={token} />}
        {mode === "reject" && <RejectForm token={token} />}
        {mode !== "none" && (
          <div>
            <Button variant="link" size="sm" className="px-0" onClick={() => setMode("none")}>
              ← Back
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
