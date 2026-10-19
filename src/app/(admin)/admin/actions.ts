"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin";
import { parseForm, shortText, uuidSchema, optionalUuidSchema } from "@/lib/validation/schemas";
import { sanitizeForLog } from "@/lib/security/sanitize";

const statusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

function safeNext(value: unknown, fallback: string): string {
  return typeof value === "string" && value.startsWith("/admin") ? value : fallback;
}

function refresh(orgId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/users");
  if (orgId) revalidatePath(`/admin/organizations/${orgId}`);
}

export async function updateOrgStatusAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const parsed = parseForm(
    z.object({ organizationId: uuidSchema, status: statusSchema, next: z.string().optional() }),
    formData,
  );
  if (!parsed.success) redirect("/admin/organizations?error=status");

  const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
  if (!org) redirect("/admin/organizations?error=missing");

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: org.id },
      data: { status: parsed.data.status },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        organizationId: org.id,
        action: "admin.organization.status_changed",
        targetType: "Organization",
        targetId: org.id,
        reason: sanitizeForLog(`${org.status} -> ${parsed.data.status}`),
      },
    }),
  ]);

  refresh(org.id);
  redirect(`${safeNext(parsed.data.next, `/admin/organizations/${org.id}`)}?ok=status`);
}

export async function updateOrgPlanAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const parsed = parseForm(
    z.object({ organizationId: uuidSchema, planId: optionalUuidSchema, next: z.string().optional() }),
    formData,
  );
  if (!parsed.success) redirect("/admin/organizations?error=plan");

  const org = await prisma.organization.findUnique({
    where: { id: parsed.data.organizationId },
    select: { id: true, planId: true, plan: { select: { name: true } } },
  });
  if (!org) redirect("/admin/organizations?error=missing");

  let planName: string | null = null;
  if (parsed.data.planId) {
    const plan = await prisma.plan.findUnique({
      where: { id: parsed.data.planId },
      select: { name: true },
    });
    if (!plan) redirect("/admin/organizations?error=plan");
    planName = plan.name;
  }

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: org.id },
      data: { planId: parsed.data.planId },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        organizationId: org.id,
        action: "admin.organization.plan_changed",
        targetType: "Organization",
        targetId: org.id,
        reason: sanitizeForLog(`${org.plan?.name ?? "none"} -> ${planName ?? "none"}`),
      },
    }),
  ]);

  refresh(org.id);
  redirect(`${safeNext(parsed.data.next, `/admin/organizations/${org.id}`)}?ok=plan`);
}

export async function renameOrgAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const parsed = parseForm(
    z.object({ organizationId: uuidSchema, name: shortText(160), next: z.string().optional() }),
    formData,
  );
  if (!parsed.success) redirect("/admin/organizations?error=name");

  const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
  if (!org) redirect("/admin/organizations?error=missing");
  if (org.name === parsed.data.name) {
    redirect(`${safeNext(parsed.data.next, `/admin/organizations/${org.id}`)}?ok=name`);
  }

  await prisma.$transaction([
    prisma.organization.update({ where: { id: org.id }, data: { name: parsed.data.name } }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        organizationId: org.id,
        action: "admin.organization.renamed",
        targetType: "Organization",
        targetId: org.id,
        reason: sanitizeForLog(`${org.name} -> ${parsed.data.name}`),
      },
    }),
  ]);

  refresh(org.id);
  redirect(`${safeNext(parsed.data.next, `/admin/organizations/${org.id}`)}?ok=name`);
}

export async function setPlatformAdminAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const parsed = parseForm(
    z.object({ userId: uuidSchema, value: z.enum(["0", "1"]) }),
    formData,
  );
  if (!parsed.success) redirect("/admin/users?error=user");

  if (parsed.data.userId === session.user.id) redirect("/admin/users?error=self");

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) redirect("/admin/users?error=missing");

  const next = parsed.data.value === "1";
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: next } }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "admin.user.platform_role_changed",
        targetType: "User",
        targetId: user.id,
        reason: sanitizeForLog(`${user.isPlatformAdmin} -> ${next}`),
      },
    }),
  ]);

  refresh();
  redirect("/admin/users?ok=role");
}

export async function unlockUserAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const parsed = parseForm(z.object({ userId: uuidSchema }), formData);
  if (!parsed.success) redirect("/admin/users?error=user");

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) redirect("/admin/users?error=missing");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "admin.user.unlocked",
        targetType: "User",
        targetId: user.id,
        reason: sanitizeForLog("cleared lockout"),
      },
    }),
  ]);

  refresh();
  redirect("/admin/users?ok=unlock");
}
