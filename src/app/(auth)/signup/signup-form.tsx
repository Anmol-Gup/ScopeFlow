"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/server/actions/auth";
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

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your agency workspace</CardTitle>
        <CardDescription>Start capturing leads and running discovery in minutes.</CardDescription>
      </CardHeader>
      <form action={formAction} className="contents">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="workspaceName">Agency name</Label>
            <Input id="workspaceName" name="workspaceName" placeholder="Acme Studio" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
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
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating workspace…" : "Create workspace"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
