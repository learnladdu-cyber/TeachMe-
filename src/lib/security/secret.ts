import { createHmac } from "node:crypto";

const raw = process.env.APP_SECRET ?? "";
const isProd = process.env.NODE_ENV === "production";
const isBuild = process.env.NEXT_PHASE === "phase-production-build";
const WEAK = !raw || raw.startsWith("dev-only") || raw.startsWith("change-me") || raw.length < 32;

if (isProd && !isBuild && WEAK) {
  throw new Error(
    "APP_SECRET must be set to a strong, unique value of at least 32 characters in production. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
  );
}

const KEY = raw || "insecure-development-secret";

// Keyed hash used to pseudonymise IP addresses and user agents before storage,
// so security logs never contain raw personal data.
export function pepper(value: string): string {
  return createHmac("sha256", KEY).update(value).digest("hex");
}

export function getSecretKey(): string {
  return KEY;
}
