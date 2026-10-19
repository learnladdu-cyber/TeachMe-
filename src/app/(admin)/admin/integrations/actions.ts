"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin";
import { getIntegrationDef } from "@/lib/integrations/registry";
import { saveIntegration } from "@/lib/integrations/store";
import { sendMail } from "@/lib/email/mailer";
import { testEmail } from "@/lib/email/templates";
import { sanitizeForLog, sanitizeMultiline, sanitizeSingleLine } from "@/lib/security/sanitize";

export async function saveIntegrationAction(formData: FormData) {
  const session = await requirePlatformAdmin();

  const key = String(formData.get("key") ?? "");
  const def = getIntegrationDef(key);
  if (!def) redirect("/admin/integrations?error=unknown");

  const config: Record<string, unknown> = {};
  for (const field of def.config) {
    const raw = formData.get(`config__${field.name}`);
    if (field.type === "boolean") {
      config[field.name] = raw === "on" || raw === "true";
    } else if (field.type === "number") {
      const n = Number(sanitizeSingleLine(raw, 20));
      config[field.name] = Number.isFinite(n) && sanitizeSingleLine(raw, 20) !== "" ? n : null;
    } else if (field.type === "textarea") {
      config[field.name] = sanitizeMultiline(raw, 4000);
    } else {
      config[field.name] = sanitizeSingleLine(raw, 400);
    }
  }

  const secrets: Record<string, string> = {};
  for (const field of def.secrets) {
    const raw = String(formData.get(`secret__${field.name}`) ?? "").trim();
    if (raw) secrets[field.name] = sanitizeSingleLine(raw, 400);
  }

  const enabled = formData.get("enabled") === "on";

  await saveIntegration(key, { enabled, config, secrets, actorId: session.user.id });
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "admin.integration.saved",
      targetType: "Integration",
      targetId: key,
      reason: sanitizeForLog(`enabled=${enabled}`),
    },
  });

  revalidatePath("/admin/integrations");
  redirect(`/admin/integrations?ok=${encodeURIComponent(key)}`);
}

export async function sendTestEmailAction() {
  const session = await requirePlatformAdmin();
  const ok = await sendMail({
    to: session.user.email,
    ...testEmail({ name: session.user.name }),
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "admin.integration.test_email",
      targetType: "Integration",
      targetId: "smtp",
      reason: sanitizeForLog(ok ? "sent" : "failed"),
    },
  });
  redirect(`/admin/integrations?${ok ? "ok=smtp-test" : "error=smtp-test"}`);
}
