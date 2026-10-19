import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";
import { verificationEmail } from "@/lib/email/templates";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createVerificationToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationTokenHash: hashToken(raw),
      emailVerificationExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return raw;
}

export async function sendVerificationEmail(user: {
  id: string;
  email: string;
  name: string;
}): Promise<boolean> {
  const raw = await createVerificationToken(user.id);
  const url = `${appUrl()}/verify-email?token=${raw}`;
  const message = verificationEmail({ name: user.name, url });
  return sendMail({ to: user.email, ...message });
}

export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "expired" };

export async function verifyEmailToken(raw: string): Promise<VerifyResult> {
  if (!raw || raw.length < 16) return { ok: false, reason: "invalid" };
  const tokenHash = hashToken(raw);

  const user = await prisma.user.findFirst({
    where: { emailVerificationTokenHash: tokenHash },
    select: { id: true, email: true, emailVerificationExpiresAt: true },
  });
  if (!user) return { ok: false, reason: "invalid" };
  if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    },
  });
  return { ok: true, email: user.email };
}
