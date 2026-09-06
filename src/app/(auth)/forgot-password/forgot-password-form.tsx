"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/server/actions/auth";
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

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>We&apos;ll email you a link to set a new password.</CardDescription>
      </CardHeader>
      <form action={formAction} className="contents">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          {state?.success && (
            <p className="text-sm text-muted-foreground" role="status">
              {state.success}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4">
              Back to login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
