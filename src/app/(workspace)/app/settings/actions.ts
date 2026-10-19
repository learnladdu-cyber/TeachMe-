"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/guard";
import { parseForm, shortText, timezoneSchema, localeSchema, uuidSchema, emailSchema } from "@/lib/validation/schemas";
import { sanitizeForLog } from "@/lib/security/sanitize";
import { createInvite, revokeInvite } from "@/lib/invites";
import { addTeamMember, createTeam, deleteTeam, removeTeamMember } from "@/lib/teams";
import { createCannedResponse, deleteCannedResponse } from "@/lib/canned";
import { createSlaPolicy, deleteSlaPolicy, setDefaultSlaPolicy } from "@/lib/sla";
import { createEndpoint, deleteEndpoint, setEndpointEnabled } from "@/lib/webhooks/store";
import { assertCanAddAgent } from "@/lib/usage";
import { generateBackupCodes, generateTotpSecret, hashBackupCode, otpauthUrl, verifyTotp } from "@/lib/twofactor";
import { eraseUserData } from "@/lib/export";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/dispatch";

const roleSchema = z.enum(["CUSTOMER", "AGENT", "TEAM_LEAD", "ORG_ADMIN"]);
const statusSchema = z.enum(["ACTIVE", "INVITED", "SUSPENDED"]);

const orgSchema = z.object({
  name: shortText(160),
  timezone: timezoneSchema,
  locale: localeSchema,
});

export async function updateOrgAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(orgSchema, formData);
  if (!parsed.success) redirect("/app/settings?error=name");

  const { name, timezone, locale } = parsed.data;

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { name, timezone, locale },
    }),
    prisma.auditLog.create({
      data: {
        actorId: ctx.session.user.id,
        organizationId: ctx.organizationId,
        action: "organization.updated",
        targetType: "Organization",
        targetId: ctx.organizationId,
        reason: sanitizeForLog(`name=${name}; timezone=${timezone}; locale=${locale}`),
      },
    }),
  ]);

  revalidatePath("/app/settings");
  revalidatePath("/app");
  redirect("/app/settings?saved=1");
}

export async function updateMemberRoleAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ membershipId: uuidSchema, role: roleSchema }), formData);
  if (!parsed.success) redirect("/app/settings?error=member");

  const membership = await prisma.membership.findFirst({
    where: { id: parsed.data.membershipId, organizationId: ctx.organizationId },
  });
  if (!membership) redirect("/app/settings?error=member");
  if (membership.userId === ctx.session.user.id) redirect("/app/settings?error=self");

  await prisma.$transaction([
    prisma.membership.update({ where: { id: membership.id }, data: { role: parsed.data.role } }),
    prisma.auditLog.create({
      data: {
        actorId: ctx.session.user.id,
        organizationId: ctx.organizationId,
        action: "membership.role_changed",
        targetType: "Membership",
        targetId: membership.id,
        reason: sanitizeForLog(`${membership.role} -> ${parsed.data.role}`),
      },
    }),
  ]);

  revalidatePath("/app/settings");
}

export async function updateMemberStatusAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ membershipId: uuidSchema, status: statusSchema }), formData);
  if (!parsed.success) redirect("/app/settings?error=member");

  const membership = await prisma.membership.findFirst({
    where: { id: parsed.data.membershipId, organizationId: ctx.organizationId },
  });
  if (!membership) redirect("/app/settings?error=member");
  if (membership.userId === ctx.session.user.id) redirect("/app/settings?error=self");

  await prisma.$transaction([
    prisma.membership.update({ where: { id: membership.id }, data: { status: parsed.data.status } }),
    prisma.auditLog.create({
      data: {
        actorId: ctx.session.user.id,
        organizationId: ctx.organizationId,
        action: "membership.status_changed",
        targetType: "Membership",
        targetId: membership.id,
        reason: sanitizeForLog(`${membership.status} -> ${parsed.data.status}`),
      },
    }),
  ]);

  revalidatePath("/app/settings");
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

const inviteSchema = z.object({ email: emailSchema, role: roleSchema });

export async function inviteMemberAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(inviteSchema, formData);
  if (!parsed.success) redirect("/app/settings?error=invite");

  try {
    await assertCanAddAgent(ctx.organizationId);
  } catch {
    redirect("/app/settings?error=agent_limit");
  }

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { name: true },
  });
  const origin = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  await createInvite({
    organizationId: ctx.organizationId,
    organizationName: org?.name ?? "HelpDeskFlow",
    inviterName: ctx.session.user.name,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedById: ctx.session.user.id,
    origin,
  });

  revalidatePath("/app/settings");
  redirect("/app/settings?saved=invite");
}

export async function revokeInviteAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ id: uuidSchema }), formData);
  if (parsed.success) await revokeInvite(ctx.organizationId, parsed.data.id);
  revalidatePath("/app/settings");
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export async function createTeamAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(
    z.object({ name: shortText(80), description: z.string().max(400).optional() }),
    formData,
  );
  if (!parsed.success) redirect("/app/settings?error=team");
  await createTeam(ctx.organizationId, parsed.data.name, parsed.data.description);
  revalidatePath("/app/settings");
  redirect("/app/settings?saved=team");
}

export async function deleteTeamAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ teamId: uuidSchema }), formData);
  if (parsed.success) await deleteTeam(ctx.organizationId, parsed.data.teamId);
  revalidatePath("/app/settings");
}

export async function addTeamMemberAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ teamId: uuidSchema, userId: uuidSchema }), formData);
  if (parsed.success) await addTeamMember(ctx.organizationId, parsed.data.teamId, parsed.data.userId);
  revalidatePath("/app/settings");
}

export async function removeTeamMemberAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ teamId: uuidSchema, userId: uuidSchema }), formData);
  if (parsed.success) await removeTeamMember(ctx.organizationId, parsed.data.teamId, parsed.data.userId);
  revalidatePath("/app/settings");
}

// ---------------------------------------------------------------------------
// Canned responses
// ---------------------------------------------------------------------------

export async function createCannedAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ title: shortText(120), body: z.string().min(1).max(8000) }), formData);
  if (!parsed.success) redirect("/app/settings?error=canned");
  await createCannedResponse(ctx.organizationId, ctx.session.user.id, parsed.data.title, parsed.data.body);
  revalidatePath("/app/settings");
  redirect("/app/settings?saved=canned");
}

export async function deleteCannedAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ id: uuidSchema }), formData);
  if (parsed.success) await deleteCannedResponse(ctx.organizationId, parsed.data.id);
  revalidatePath("/app/settings");
}

// ---------------------------------------------------------------------------
// SLA policies
// ---------------------------------------------------------------------------

const slaSchema = z.object({
  name: shortText(80),
  firstResponseMins: z.coerce.number().int().min(1).max(100000),
  resolutionMins: z.coerce.number().int().min(1).max(100000),
  bhEnabled: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  bhStart: z.coerce.number().int().min(0).max(23).default(9),
  bhEnd: z.coerce.number().int().min(1).max(24).default(17),
  bhDays: z.string().optional(),
});

export async function createSlaAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(slaSchema, formData);
  if (!parsed.success) redirect("/app/settings?error=sla");
  const days = String(parsed.data.bhDays ?? "1,2,3,4,5")
    .split(/[,\s]+/)
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  await createSlaPolicy({
    organizationId: ctx.organizationId,
    name: parsed.data.name,
    firstResponseMins: parsed.data.firstResponseMins,
    resolutionMins: parsed.data.resolutionMins,
    businessHours: {
      enabled: parsed.data.bhEnabled,
      days: days.length ? days : [1, 2, 3, 4, 5],
      start: parsed.data.bhStart,
      end: parsed.data.bhEnd,
    },
  });
  revalidatePath("/app/settings");
  redirect("/app/settings?saved=sla");
}

export async function setDefaultSlaAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ id: uuidSchema }), formData);
  if (parsed.success) await setDefaultSlaPolicy(ctx.organizationId, parsed.data.id);
  revalidatePath("/app/settings");
}

export async function deleteSlaAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ id: uuidSchema }), formData);
  if (parsed.success) await deleteSlaPolicy(ctx.organizationId, parsed.data.id);
  revalidatePath("/app/settings");
}

// ---------------------------------------------------------------------------
// Outbound webhooks
// ---------------------------------------------------------------------------

export async function createWebhookAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(
    z.object({
      url: z.string().url().max(500),
      secret: z.string().max(200).optional(),
      events: z.string().optional(),
    }),
    formData,
  );
  if (!parsed.success) redirect("/app/settings?error=webhook");

  const selected = String(parsed.data.events ?? "")
    .split(/[,\s]+/)
    .filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));

  try {
    await createEndpoint({
      organizationId: ctx.organizationId,
      createdById: ctx.session.user.id,
      url: parsed.data.url,
      secret: parsed.data.secret,
      events: selected,
    });
  } catch {
    redirect("/app/settings?error=webhook");
  }

  revalidatePath("/app/settings");
  redirect("/app/settings?saved=webhook");
}

export async function toggleWebhookAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(
    z.object({ id: uuidSchema, enabled: z.preprocess((v) => v === "on" || v === "true", z.boolean()) }),
    formData,
  );
  if (parsed.success) await setEndpointEnabled(ctx.organizationId, parsed.data.id, parsed.data.enabled);
  revalidatePath("/app/settings");
}

export async function deleteWebhookAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ id: uuidSchema }), formData);
  if (parsed.success) await deleteEndpoint(ctx.organizationId, parsed.data.id);
  revalidatePath("/app/settings");
}

// ---------------------------------------------------------------------------
// Two-factor authentication (per signed-in user)
// ---------------------------------------------------------------------------

export async function beginTwoFactorAction() {
  const ctx = await requireStaff("ORG_ADMIN");
  if (ctx.role) {
    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: ctx.session.user.id }, data: { totpSecret: secret } });
  }
  revalidatePath("/app/settings");
}

export async function enableTwoFactorAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ code: z.string().min(6).max(10) }), formData);
  if (!parsed.success) redirect("/app/settings?error=2fa");

  const user = await prisma.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { totpSecret: true },
  });
  if (!user?.totpSecret || !verifyTotp(user.totpSecret, parsed.data.code)) {
    redirect("/app/settings?error=2fa_code");
  }

  const codes = generateBackupCodes();
  await prisma.user.update({
    where: { id: ctx.session.user.id },
    data: {
      totpEnabledAt: new Date(),
      backupCodes: codes.map(hashBackupCode),
    },
  });

  const store = await cookies();
  store.set("hdf_mfa_backup", JSON.stringify(codes), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  });

  revalidatePath("/app/settings");
  redirect("/app/settings?saved=2fa");
}

export async function disableTwoFactorAction() {
  const ctx = await requireStaff("ORG_ADMIN");
  await prisma.user.update({
    where: { id: ctx.session.user.id },
    data: { totpEnabledAt: null, totpSecret: null, backupCodes: Prisma.DbNull },
  });
  revalidatePath("/app/settings");
  redirect("/app/settings?saved=2fa_off");
}

// ---------------------------------------------------------------------------
// Privacy / data
// ---------------------------------------------------------------------------

export async function eraseUserAction(formData: FormData) {
  const ctx = await requireStaff("ORG_ADMIN");
  const parsed = parseForm(z.object({ userId: uuidSchema }), formData);
  if (parsed.success && parsed.data.userId !== ctx.session.user.id) {
    await eraseUserData(ctx.organizationId, parsed.data.userId);
  }
  revalidatePath("/app/settings");
  redirect("/app/settings?saved=erased");
}
