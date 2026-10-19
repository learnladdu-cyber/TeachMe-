import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";

export type Usage = {
  agentCount: number;
  monthlyTickets: number;
  planName: string | null;
  agentLimit: number | null;
  monthlyTicketLimit: number | null;
  overAgents: boolean;
  overTickets: boolean;
};

export async function getUsage(organizationId: string): Promise<Usage> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [org, agentCount, monthlyTickets] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: { plan: true },
    }),
    prisma.membership.count({
      where: { organizationId, role: { in: ["AGENT", "TEAM_LEAD", "ORG_ADMIN"] }, status: "ACTIVE" },
    }),
    prisma.ticket.count({ where: { organizationId, createdAt: { gte: startOfMonth } } }),
  ]);

  const agentLimit = org?.plan?.agentLimit ?? null;
  const monthlyTicketLimit = org?.plan?.monthlyTickets ?? null;

  return {
    agentCount,
    monthlyTickets,
    planName: org?.plan?.name ?? null,
    agentLimit,
    monthlyTicketLimit,
    overAgents: agentLimit !== null && agentCount > agentLimit,
    overTickets: monthlyTicketLimit !== null && monthlyTickets >= monthlyTicketLimit,
  };
}

// Raises a 402 when creating another ticket would exceed the plan's monthly cap.
export async function assertCanCreateTicket(organizationId: string): Promise<void> {
  const usage = await getUsage(organizationId);
  if (usage.overTickets) {
    throw new ApiError(
      402,
      "plan_limit_reached",
      `Your ${usage.planName ?? "current"} plan allows ${usage.monthlyTicketLimit} tickets per month. Upgrade to continue.`,
    );
  }
}

export async function assertCanAddAgent(organizationId: string): Promise<void> {
  const usage = await getUsage(organizationId);
  if (usage.agentLimit !== null && usage.agentCount >= usage.agentLimit) {
    throw new ApiError(
      402,
      "plan_limit_reached",
      `Your ${usage.planName ?? "current"} plan allows ${usage.agentLimit} agents. Upgrade to invite more.`,
    );
  }
}
