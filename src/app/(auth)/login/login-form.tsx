"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ResendVerificationForm } from "./resend-verification-form";

export function LoginForm({ callbackUrl, banner }: { callbackUrl: string; banner?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex w-full flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Welcome back to scopeflow.</CardDescription>
        </CardHeader>
        <form action={formAction} className="contents">
          <CardContent className="flex flex-col gap-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            {banner && !state?.error && (
              <p className="text-sm text-muted-foreground" role="status">
                {banner}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground underline underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput id="password" name="password" autoComplete="current-password" required />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Logging in…" : "Log in"}
            </Button>
            <p className="text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/signup" className="underline underline-offset-4">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      {state?.needsVerification && <ResendVerificationForm />}
    </div>
  );
}
