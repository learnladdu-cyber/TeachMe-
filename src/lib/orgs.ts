import { prisma } from "@/lib/db";

export async function listStaff(organizationId: string) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId, role: { in: ["AGENT", "TEAM_LEAD", "ORG_ADMIN"] } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { role: "desc" },
  });
  return memberships.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email, role: m.role }));
}
