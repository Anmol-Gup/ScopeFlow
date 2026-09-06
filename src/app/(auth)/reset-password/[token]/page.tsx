import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resetToken = await db.passwordResetToken.findUnique({ where: { token } });
  const now = new Date();
  const isValid = !!resetToken && resetToken.expiresAt.getTime() > now.getTime();

  if (!isValid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link expired</CardTitle>
          <CardDescription>This password reset link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/forgot-password">Request a new link</Link>}
          />
        </CardFooter>
      </Card>
    );
  }

  return <ResetPasswordForm token={token} />;
}
