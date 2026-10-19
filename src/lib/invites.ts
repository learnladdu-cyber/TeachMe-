import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendLoggedEmail } from "@/lib/notifications";
import { inviteEmail } from "@/lib/email/ticket-templates";

const INVITE_TTL_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function listInvites(organizationId: string) {
  return prisma.organizationInvite.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { name: true } } },
  });
}

export async function createInvite(input: {
  organizationId: string;
  organizationName: string;
  inviterName: string;
  email: string;
  role: Role;
  invitedById: string;
  origin: string;
}): Promise<{ id: string }> {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: input.organizationId,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      tokenHash: hashToken(raw),
      invitedById: input.invitedById,
      expiresAt,
    },
  });

  const url = `${input.origin}/invite/${raw}`;
  await sendLoggedEmail({
    to: input.email,
    template: "invite",
    organizationId: input.organizationId,
    ...inviteEmail({
      orgName: input.organizationName,
      inviterName: input.inviterName,
      role: input.role,
      url,
    }),
  });

  return { id: invite.id };
}

export async function revokeInvite(organizationId: string, id: string) {
  await prisma.organizationInvite.updateMany({
    where: { id, organizationId, status: "PENDING" },
    data: { status: "REVOKED" },
  });
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.organizationInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });
  if (!invite) return null;
  if (invite.status !== "PENDING") return null;
  if (invite.expiresAt < new Date()) {
    await prisma.organizationInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return null;
  }
  return invite;
}

// Accepts an invite for a user, creating/activating their membership.
export async function acceptInvite(token: string, user: { id: string; email: string }): Promise<
  { ok: true; organizationId: string } | { ok: false; reason: string }
> {
  const invite = await getInviteByToken(token);
  if (!invite) return { ok: false, reason: "invalid_or_expired" };
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, reason: "email_mismatch" };
  }

  await prisma.$transaction([
    prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId: user.id } },
      update: { role: invite.role, status: "ACTIVE" },
      create: {
        organizationId: invite.organizationId,
        userId: user.id,
        role: invite.role,
        status: "ACTIVE",
        invitedById: invite.invitedById,
      },
    }),
    prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
  ]);

  return { ok: true, organizationId: invite.organizationId };
}
