import { prisma } from "@/lib/db";

export async function listTeams(organizationId: string) {
  const teams = await prisma.team.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { tickets: true } },
    },
  });
  return teams;
}

export async function createTeam(organizationId: string, name: string, description?: string) {
  return prisma.team.create({
    data: { organizationId, name: name.trim(), description: description?.trim() || null },
  });
}

export async function updateTeam(organizationId: string, id: string, name: string, description?: string) {
  const team = await prisma.team.findFirst({ where: { id, organizationId } });
  if (!team) throw new Error("Team not found");
  return prisma.team.update({
    where: { id },
    data: { name: name.trim(), description: description?.trim() || null },
  });
}

export async function deleteTeam(organizationId: string, id: string) {
  const team = await prisma.team.findFirst({ where: { id, organizationId } });
  if (!team) throw new Error("Team not found");
  await prisma.team.delete({ where: { id } });
}

export async function addTeamMember(organizationId: string, teamId: string, userId: string) {
  const [team, membership] = await Promise.all([
    prisma.team.findFirst({ where: { id: teamId, organizationId } }),
    prisma.membership.findFirst({ where: { organizationId, userId, status: "ACTIVE" } }),
  ]);
  if (!team || !membership) throw new Error("Invalid team or member");
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    update: {},
    create: { teamId, userId },
  });
}

export async function removeTeamMember(organizationId: string, teamId: string, userId: string) {
  const team = await prisma.team.findFirst({ where: { id: teamId, organizationId } });
  if (!team) throw new Error("Team not found");
  await prisma.teamMember.deleteMany({ where: { teamId, userId } });
}
