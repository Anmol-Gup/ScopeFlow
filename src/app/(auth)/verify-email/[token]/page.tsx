import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifyEmailButton } from "./verify-email-button";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verificationToken = await db.emailVerificationToken.findUnique({
    where: { token },
    select: { expiresAt: true, user: { select: { emailVerified: true } } },
  });
  const now = new Date();

  const alreadyVerified = verificationToken?.user.emailVerified != null;
  const isValid =
    !!verificationToken && !alreadyVerified && verificationToken.expiresAt.getTime() > now.getTime();

  const description = alreadyVerified
    ? "This email is already verified."
    : isValid
      ? "Confirm your email address to activate your account."
      : "This verification link is invalid or has expired.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {alreadyVerified ? (
          <p className="text-sm text-muted-foreground">You&apos;re all set — you can log in now.</p>
        ) : !isValid ? (
          <p className="text-sm text-muted-foreground">
            Try logging in to request a new verification link.
          </p>
        ) : null}
      </CardContent>
      {isValid ? (
        <CardFooter>
          <VerifyEmailButton token={token} />
        </CardFooter>
      ) : (
        <CardFooter>
          <Button className="w-full" nativeButton={false} render={<Link href="/login">Back to login</Link>} />
        </CardFooter>
      )}
    </Card>
  );
}
