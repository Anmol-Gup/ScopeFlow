import nodemailer from "nodemailer";
import { SITE_NAME, SITE_URL } from "@/lib/site";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE } = process.env;
  if (!SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? Number(SMTP_PORT) : 587,
    secure: SMTP_SECURE === "true",
    auth: SMTP_USER && SMTP_PASSWORD ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

async function sendEmail(options: { to: string; subject: string; html: string; text: string }) {
  const client = getTransporter();
  if (!client) {
    // No SMTP configured (e.g. local dev) — log the link instead of failing
    // the calling action, so the flow stays testable without real SMTP creds.
    console.warn(
      `[email] SMTP_HOST is not configured — would have sent "${options.subject}" to ${options.to}:\n${options.text}`
    );
    return;
  }
  await client.sendMail({
    from: process.env.SMTP_FROM || `${SITE_NAME} <no-reply@scopeflow.local>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${SITE_URL}/verify-email/${token}`;
  await sendEmail({
    to: email,
    subject: `Verify your email for ${SITE_NAME}`,
    text: `Confirm your email address to activate your ${SITE_NAME} account:\n\n${link}\n\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.`,
    html: `
      <p>Confirm your email address to activate your ${SITE_NAME} account.</p>
      <p><a href="${link}">Verify my email</a></p>
      <p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${SITE_URL}/reset-password/${token}`;
  await sendEmail({
    to: email,
    subject: `Reset your ${SITE_NAME} password`,
    text: `We received a request to reset your ${SITE_NAME} password:\n\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email — your password will not change.`,
    html: `
      <p>We received a request to reset your ${SITE_NAME} password.</p>
      <p><a href="${link}">Reset my password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email — your password will not change.</p>
    `,
  });
}
