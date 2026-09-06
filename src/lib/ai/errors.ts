// Provider SDK error messages sometimes echo back a truncated form of the API
// key that caused the error (seen historically from some providers' auth
// error text). Redact anything that looks like a key before it ever reaches
// the browser, rather than trusting the SDK not to include one.
const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{8,}/gi,
  /sk-[A-Za-z0-9_-]{16,}/gi,
  /AIza[A-Za-z0-9_-]{16,}/gi,
  /Bearer\s+[A-Za-z0-9._-]{16,}/gi,
];

export function toSafeProviderErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Unknown error";
  return SECRET_PATTERNS.reduce((message, pattern) => message.replace(pattern, "[redacted]"), raw);
}
