import crypto from "node:crypto";
import { getSecretKey } from "@/lib/security/secret";

// AES-256-GCM encryption for integration credentials. The key is derived from
// APP_SECRET so secrets at rest are useless without the app secret.
const KEY = crypto.createHash("sha256").update(`integrations:${getSecretKey()}`).digest();

export function encryptSecrets(value: Record<string, unknown> | null | undefined): string | null {
  if (!value) return null;
  const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entries.length === 0) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(Object.fromEntries(entries)), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${data.toString("base64")}`;
}

export function decryptSecrets(blob: string | null | undefined): Record<string, string> {
  if (!blob) return {};
  try {
    const [ivPart, tagPart, dataPart] = blob.split(".");
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivPart, "base64"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64"));
    const out = Buffer.concat([decipher.update(Buffer.from(dataPart, "base64")), decipher.final()]);
    return JSON.parse(out.toString("utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

// Masks a secret for display (never send real values to the client).
export function maskSecret(value: string | undefined | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}
