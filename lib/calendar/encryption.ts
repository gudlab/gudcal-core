import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Persistent AES-256 key for calendar OAuth tokens.
 *
 * A missing or invalid ENCRYPTION_KEY must fail loudly. A random per-process
 * fallback would encrypt tokens that cannot be decrypted after restart.
 */
export function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim() ?? "";
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Calendar OAuth tokens cannot be encrypted with a random per-process key (tokens would be unreadable after restart). Set ENCRYPTION_KEY to a persistent 64-character hex value (openssl rand -hex 32).",
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). Generate one with: openssl rand -hex 32",
    );
  }
  return Buffer.from(raw, "hex");
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
