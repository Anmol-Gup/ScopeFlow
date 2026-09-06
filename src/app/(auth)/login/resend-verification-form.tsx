"use client";

import { useActionState } from "react";
import { resendVerificationAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ResendVerificationForm() {
  const [state, formAction, pending] = useActionState(resendVerificationAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resend verification email</CardTitle>
        <CardDescription>Enter your email and we&apos;ll send a new verification link.</CardDescription>
      </CardHeader>
      <form action={formAction} className="contents">
        <CardContent className="flex flex-col gap-3">
          <Label htmlFor="resend-email" className="sr-only">
            Email
          </Label>
          <Input id="resend-email" name="email" type="email" placeholder="you@company.com" required />
          {state?.success && (
            <p className="text-sm text-muted-foreground" role="status">
              {state.success}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" variant="outline" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Resend link"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
