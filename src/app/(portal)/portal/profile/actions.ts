"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  destroySession,
  getSession,
  revokeAllSessions,
  revokeSession,
} from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordProblems } from "@/lib/security/password-policy";
import { rateLimit } from "@/lib/security/rate-limit";
import { recordSecurityEvent } from "@/lib/security/audit";
import { clientMetaFromNextHeaders } from "@/lib/security/request";
import { z } from "zod";
import { localeSchema, parseForm, shortText, uuidSchema } from "@/lib/validation/schemas";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function updateProfileAction(formData: FormData) {
  const session = await requireSession();
  const parsed = parseForm(z.object({ name: shortText(120), locale: localeSchema }), formData);
  if (!parsed.success) redirect("/portal/profile?error=name");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name, locale: parsed.data.locale },
  });
  revalidatePath("/portal/profile");
  redirect("/portal/profile?saved=1");
}

export async function changePasswordAction(formData: FormData) {
  const session = await requireSession();

  const limit = rateLimit(`password:user:${session.user.id}`, 5, 15 * 60_000);
  if (!limit.ok) redirect("/portal/profile?error=throttled");

  const current = String(formData.get("current") ?? "").slice(0, 200);
  const next = String(formData.get("next") ?? "").slice(0, 200);
  const confirm = String(formData.get("confirm") ?? "").slice(0, 200);

  if (next !== confirm) redirect("/portal/profile?error=mismatch");

  const record = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!record || !(await verifyPassword(current, record.passwordHash))) {
    redirect("/portal/profile?error=current");
  }

  const problems = passwordProblems(next, { email: record.email, name: record.name });
  if (problems.length > 0) redirect("/portal/profile?error=policy");

  await prisma.user.update({
    where: { id: record.id },
    data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() },
  });

  // Any other session could belong to an attacker; revoke everything else.
  const revoked = await revokeAllSessions(record.id, { exceptSessionId: session.sessionId });

  const meta = await clientMetaFromNextHeaders();
  await recordSecurityEvent({
    type: "password.changed",
    userId: record.id,
    organizationId: session.activeOrganizationId,
    email: record.email,
    headers: new Headers({ "user-agent": meta.userAgent }),
    detail: `${revoked} other session(s) revoked`,
  });

  redirect("/portal/profile?saved=pw");
}

export async function revokeSessionAction(formData: FormData) {
  const session = await requireSession();
  const parsed = parseForm(z.object({ sessionId: uuidSchema }), formData);
  if (!parsed.success || parsed.data.sessionId === session.sessionId) {
    redirect("/portal/profile");
  }

  await revokeSession(parsed.data.sessionId, session.user.id);
  await recordSecurityEvent({
    type: "session.revoked",
    userId: session.user.id,
    organizationId: session.activeOrganizationId,
    email: session.user.email,
    detail: parsed.data.sessionId,
  });

  revalidatePath("/portal/profile");
  redirect("/portal/profile?saved=session");
}

export async function signOutEverywhereAction() {
  const session = await requireSession();
  const revoked = await revokeAllSessions(session.user.id);
  await recordSecurityEvent({
    type: "sessions.revoked_all",
    userId: session.user.id,
    organizationId: session.activeOrganizationId,
    email: session.user.email,
    detail: `${revoked} session(s) revoked`,
  });
  await destroySession();
  redirect("/login");
}
