"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <form action={formAction} className="contents">
        <CardContent className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Reset password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
