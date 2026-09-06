"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { generateSecureToken } from "@/lib/tokens";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

export type AuthActionState = { error?: string; needsVerification?: boolean } | undefined;

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

async function issueEmailVerificationToken(userId: string) {
  const token = generateSecureToken();
  await db.emailVerificationToken.create({
    data: { token, userId, expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS) },
  });
  return token;
}

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  workspaceName: z.string().trim().min(1, "Agency name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "workspace"}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    workspaceName: formData.get("workspaceName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, workspaceName, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, name, passwordHash } });
    const workspace = await tx.workspace.create({
      data: { name: workspaceName, slug: slugify(workspaceName) },
    });
    await tx.workspaceMember.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" },
    });
    await tx.activity.create({
      data: {
        workspaceId: workspace.id,
        type: "workspace.created",
        description: `${workspaceName} workspace created`,
      },
    });
    return user;
  });

  const token = await issueEmailVerificationToken(user.id);
  await sendVerificationEmail(email, token);

  redirect("/login?registered=1");
}

// Only ever a same-origin relative path — never an absolute URL or
// protocol-relative "//host" string, which a browser would treat as pointing
// at another host entirely.
function isSafeRedirectPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestedCallbackUrl = String(formData.get("callbackUrl") || "/dashboard");
  const callbackUrl = isSafeRedirectPath(requestedCallbackUrl) ? requestedCallbackUrl : "/dashboard";

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "email-not-verified") {
      return {
        error: "Please verify your email before logging in.",
        needsVerification: true,
      };
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export type MessageActionState = { error?: string; success?: string } | undefined;

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");

export async function resendVerificationAction(
  _prevState: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  const genericSuccess = {
    success: "If an account with that email exists and isn't verified yet, we've sent a new link.",
  };
  if (!parsed.success) return genericSuccess;

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  if (user && !user.emailVerified) {
    await db.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    const token = await issueEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, token);
  }
  return genericSuccess;
}

export async function forgotPasswordAction(
  _prevState: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  const genericSuccess = {
    success: "If an account with that email exists, we've sent a password reset link.",
  };
  if (!parsed.success) return genericSuccess;

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  if (user) {
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const token = generateSecureToken();
    await db.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
    });
    await sendPasswordResetEmail(user.email, token);
  }
  return genericSuccess;
}

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, password } = parsed.data;

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { passwordHash: true } } },
  });
  if (!resetToken || resetToken.expiresAt.getTime() < Date.now()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const samePassword = await bcrypt.compare(password, resetToken.user.passwordHash);
  if (samePassword) {
    return { error: "Your new password must be different from your current password." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    db.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } }),
  ]);

  redirect("/login?reset=1");
}

export async function verifyEmailAction(token: string): Promise<{ error?: string }> {
  const verificationToken = await db.emailVerificationToken.findUnique({ where: { token } });
  if (!verificationToken || verificationToken.expiresAt.getTime() < Date.now()) {
    return { error: "This verification link is invalid or has expired." };
  }

  await db.$transaction([
    db.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    }),
    // Delete every other outstanding token for this user, but keep the one
    // just used — a revisit of the same link can then be told apart from a
    // genuinely invalid one (see verify-email/[token]/page.tsx).
    db.emailVerificationToken.deleteMany({
      where: { userId: verificationToken.userId, NOT: { id: verificationToken.id } },
    }),
  ]);

  redirect("/login?verified=1");
}
