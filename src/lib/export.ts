import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Full data export for an organization (GDPR portability).
export async function exportOrganizationData(organizationId: string) {
  const [org, tickets, articles, members, tags, automations] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.ticket.findMany({
      where: { organizationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
        tags: { include: { tag: true } },
        csat: true,
      },
    }),
    prisma.knowledgeArticle.findMany({ where: { organizationId } }),
    prisma.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    }),
    prisma.tag.findMany({ where: { organizationId } }),
    prisma.automationRule.findMany({ where: { organizationId } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    organization: org,
    members,
    tickets,
    articles,
    tags,
    automations,
  };
}

// Data export for a single user within a tenant.
export async function exportUserData(organizationId: string, userId: string) {
  const [user, tickets, messages, notifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        emailVerifiedAt: true,
        totpEnabledAt: true,
      },
    }),
    prisma.ticket.findMany({ where: { organizationId, requesterId: userId } }),
    prisma.message.findMany({ where: { organizationId, authorId: userId } }),
    prisma.notification.findMany({ where: { userId } }),
  ]);
  return { exportedAt: new Date().toISOString(), user, tickets, messages, notifications };
}

// Right-to-erasure: anonymizes a user's PII while preserving referential
// integrity for tenant records. Returns false if the user is not in the tenant.
export async function eraseUserData(organizationId: string, userId: string): Promise<boolean> {
  const membership = await prisma.membership.findFirst({ where: { organizationId, userId } });
  if (!membership) return false;

  const anonymousEmail = `erased+${userId.slice(0, 8)}@example.invalid`;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        name: "Erased user",
        email: anonymousEmail,
        passwordHash: randomBytes(32).toString("hex"),
        totpSecret: null,
        totpEnabledAt: null,
        backupCodes: Prisma.DbNull,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    }),
    prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.membership.updateMany({ where: { userId }, data: { status: "SUSPENDED" } }),
    prisma.auditLog.create({
      data: {
        organizationId,
        action: "privacy.user_erased",
        targetType: "User",
        targetId: userId,
        reason: "GDPR erasure request",
      },
    }),
  ]);
  return true;
}
