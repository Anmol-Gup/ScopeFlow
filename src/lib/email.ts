import nodemailer from "nodemailer";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { DEFAULT_ACCENT_COLOR } from "@/lib/branding";

// Table-based layout with inline styles only — the only markup that renders
// consistently across Gmail, Outlook, and Apple Mail. No <style> block:
// Outlook strips <head> entirely and several major clients ignore embedded
// stylesheets on transactional mail.
function renderEmailHtml(options: {
  title: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
  footnote: string;
}) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;border:1px solid #e4e4e7;">
        <tr>
          <td style="padding:20px 32px;border-bottom:2px solid ${DEFAULT_ACCENT_COLOR};">
            <span style="font-size:18px;font-weight:700;color:${DEFAULT_ACCENT_COLOR};">${SITE_NAME}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#18181b;">${options.title}</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">${options.body}</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:6px;background-color:${DEFAULT_ACCENT_COLOR};">
                  <a href="${options.buttonHref}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${options.buttonLabel}</a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">${options.footnote}</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#a1a1aa;">${SITE_NAME}</p>
    </td>
  </tr>
</table>`;
}

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
    html: renderEmailHtml({
      title: "Confirm your email address",
      body: `Activate your ${SITE_NAME} account to start turning client conversations into locked, versioned scope.`,
      buttonLabel: "Verify my email",
      buttonHref: link,
      footnote: "This link expires in 24 hours. If you didn't create this account, you can ignore this email.",
    }),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${SITE_URL}/reset-password/${token}`;
  await sendEmail({
    to: email,
    subject: `Reset your ${SITE_NAME} password`,
    text: `We received a request to reset your ${SITE_NAME} password:\n\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email — your password will not change.`,
    html: renderEmailHtml({
      title: "Reset your password",
      body: `We received a request to reset your ${SITE_NAME} password.`,
      buttonLabel: "Reset my password",
      buttonHref: link,
      footnote: "This link expires in 1 hour. If you didn't request this, you can ignore this email — your password will not change.",
    }),
  });
}
