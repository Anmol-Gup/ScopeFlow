import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be set to a 32-byte hex string (64 hex characters)."
    );
  }
  return Buffer.from(hex, "hex");
}

// Encrypts plaintext for at-rest storage (e.g. a BYOK provider API key).
// Output format: <iv>:<authTag>:<ciphertext>, all hex-encoded.
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Invalid encrypted payload format.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// For display only — never log or return the real key after initial entry.
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}${"•".repeat(8)}${key.slice(-4)}`;
}
