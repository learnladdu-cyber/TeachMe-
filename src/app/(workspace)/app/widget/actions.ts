"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/guard";
import { parseForm, shortText } from "@/lib/validation/schemas";
import { sanitizeForLog, sanitizeSingleLine } from "@/lib/security/sanitize";
import { normalizeOrigin } from "@/lib/chat/validation";
import { updateWidgetConfig } from "@/lib/chat/service";

const widgetSchema = z.object({
  enabled: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  welcome: shortText(240, { min: 0 }),
  launcherLabel: shortText(60, { min: 0 }),
  position: z.enum(["right", "left"]).catch("right"),
  accent: z
    .preprocess(
      (v) => sanitizeSingleLine(v, 7),
      z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1b1533."),
    )
    .catch("#1b1533"),
  allowedOrigins: z.string().max(4000).optional(),
});

export async function updateChatWidgetAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(widgetSchema, formData);
  if (!parsed.success) redirect("/app/widget?error=widget");

  const origins = String(parsed.data.allowedOrigins ?? "")
    .split(/[\n,]+/)
    .map((line) => normalizeOrigin(line))
    .filter((value): value is string => Boolean(value));
  const allowedOrigins = [...new Set(origins)];

  await updateWidgetConfig(ctx.organizationId, {
    enabled: parsed.data.enabled,
    welcome: parsed.data.welcome,
    accent: parsed.data.accent,
    launcherLabel: parsed.data.launcherLabel,
    position: parsed.data.position,
    allowedOrigins,
  });

  await prisma.auditLog.create({
    data: {
      actorId: ctx.session.user.id,
      organizationId: ctx.organizationId,
      action: "chat_widget.updated",
      targetType: "Organization",
      targetId: ctx.organizationId,
      reason: sanitizeForLog(
        `enabled=${parsed.data.enabled}; position=${parsed.data.position}; origins=${allowedOrigins.join(",") || "any"}`,
      ),
    },
  });

  revalidatePath("/app/widget");
  revalidatePath("/app/chat");
  redirect("/app/widget?saved=1");
}
