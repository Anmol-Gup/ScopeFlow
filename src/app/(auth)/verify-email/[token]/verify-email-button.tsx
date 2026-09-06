"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { verifyEmailAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function VerifyEmailButton({ token }: { token: string }) {
  const [error, setError] = useState<string | undefined>();
  const [verified, setVerified] = useState(false);
  const [pending, startTransition] = useTransition();

  if (verified) {
    return (
      <div className="flex w-full flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-8 text-primary" />
        <p className="text-sm font-medium">Email verified!</p>
        <Button className="w-full" nativeButton={false} render={<Link href="/login?verified=1">Continue to login</Link>} />
      </div>
    );
  }

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
            else setVerified(true);
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
