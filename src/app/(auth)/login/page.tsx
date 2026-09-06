import { LoginForm } from "./login-form";

const BANNERS: Record<string, string> = {
  registered: "Account created — check your email to verify your account before logging in.",
  verified: "Email verified — you can now log in.",
  reset: "Password updated — you can now log in with your new password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; registered?: string; verified?: string; reset?: string }>;
}) {
  const { callbackUrl, registered, verified, reset } = await searchParams;
  const banner = registered
    ? BANNERS.registered
    : verified
      ? BANNERS.verified
      : reset
        ? BANNERS.reset
        : undefined;
  return <LoginForm callbackUrl={callbackUrl || "/dashboard"} banner={banner} />;
}
