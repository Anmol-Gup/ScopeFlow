import { randomBytes } from "node:crypto";

// Long enough to be practically unguessable for a public, token-only-gated URL.
export function generateSecureToken(): string {
  return randomBytes(24).toString("hex");
}
