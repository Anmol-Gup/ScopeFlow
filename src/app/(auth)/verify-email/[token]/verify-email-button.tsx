"use client";

import { useState, useTransition } from "react";
import { verifyEmailAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function VerifyEmailButton({ token }: { token: string }) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex w-full flex-col gap-3">
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await verifyEmailAction(token);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? "Verifying…" : "Verify my email"}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
