import type { MembershipStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isStaff } from "@/lib/auth";

export type MemberRow = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  status: MembershipStatus;
  joinedAt: Date;
  isStaff: boolean;
  requested: number;
  assigned: number;
  lastActivity: Date | null;
};

export async function listMembers(
  organizationId: string,
  opts: { q?: string; role?: Role | "ALL" } = {},
): Promise<MemberRow[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
      ...(opts.role && opts.role !== "ALL" ? { role: opts.role } : {}),
      ...(opts.q
        ? {
            user: {
              OR: [
                { name: { contains: opts.q, mode: "insensitive" } },
                { email: { contains: opts.q, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "desc" }],
  });

  const ids = memberships.map((m) => m.userId);
  if (ids.length === 0) return [];

  const [requested, assigned, lastEvents] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["requesterId"],
      where: { organizationId, requesterId: { in: ids } },
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
    prisma.ticket.groupBy({
      by: ["assigneeId"],
      where: { organizationId, assigneeId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.ticketEvent.groupBy({
      by: ["actorId"],
      where: { organizationId, actorId: { in: ids } },
      _max: { createdAt: true },
    }),
  ]);

  const requestedMap = new Map(requested.map((r) => [r.requesterId, r]));
  const assignedMap = new Map(assigned.map((r) => [r.assigneeId as string, r._count._all]));
  const eventMap = new Map(lastEvents.map((r) => [r.actorId as string, r._max.createdAt]));

  return memberships.map((m) => {
    const req = requestedMap.get(m.userId);
    const lastCandidates = [req?._max.updatedAt, eventMap.get(m.userId)].filter(
      (d): d is Date => Boolean(d),
    );
    return {
      membershipId: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role as Role,
      status: m.status,
      joinedAt: m.joinedAt,
      isStaff: isStaff(m.role as Role),
      requested: req?._count._all ?? 0,
      assigned: assignedMap.get(m.userId) ?? 0,
      lastActivity:
        lastCandidates.length > 0
          ? new Date(Math.max(...lastCandidates.map((d) => d.getTime())))
          : null,
    };
  });
}
