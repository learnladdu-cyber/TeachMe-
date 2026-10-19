import { prisma } from "@/lib/db";
import type { TicketStatus } from "@prisma/client";

const CLOSED: TicketStatus[] = ["RESOLVED", "CLOSED"];
const OPEN_LIKE: TicketStatus[] = ["NEW", "OPEN", "PENDING", "ON_HOLD"];

export type ReportRange = "7d" | "30d" | "90d" | "all";

export const RANGES: { key: ReportRange; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

function rangeStart(range: ReportRange): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getOrgReport(organizationId: string, range: ReportRange) {
  const start = rangeStart(range);
  const scope = { organizationId, ...(start ? { createdAt: { gte: start } } : {}) };

  const [total, byStatus, byPriority, byChannel, dailyRows, topRows, assigneeRows] =
    await Promise.all([
      prisma.ticket.count({ where: scope }),
      prisma.ticket.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ["priority"], where: scope, _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ["channel"], where: scope, _count: { _all: true } }),
      prisma.ticket.findMany({
        where: scope,
        select: { createdAt: true, resolvedAt: true },
      }),
      prisma.ticket.groupBy({
        by: ["requesterId"],
        where: scope,
        _count: { _all: true },
        orderBy: { _count: { requesterId: "desc" } },
        take: 5,
      }),
      prisma.ticket.groupBy({
        by: ["assigneeId"],
        where: { ...scope, assigneeId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { assigneeId: "desc" } },
        take: 6,
      }),
    ]);

  const statusCount = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])) as Record<
    string,
    number
  >;
  const priorityCount = Object.fromEntries(byPriority.map((r) => [r.priority, r._count._all])) as Record<
    string,
    number
  >;
  const channelCount = Object.fromEntries(byChannel.map((r) => [r.channel, r._count._all])) as Record<
    string,
    number
  >;

  const openCount = OPEN_LIKE.reduce((a, s) => a + (statusCount[s] ?? 0), 0);
  const closedCount = CLOSED.reduce((a, s) => a + (statusCount[s] ?? 0), 0);
  const resolutionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

  const resolvedWithTime = dailyRows.filter((t) => t.resolvedAt);
  const avgResolutionMs =
    resolvedWithTime.length > 0
      ? resolvedWithTime.reduce(
          (a, t) => a + (t.resolvedAt!.getTime() - t.createdAt.getTime()),
          0,
        ) / resolvedWithTime.length
      : 0;

  // Daily created volume bucketed over the range window.
  const windowDays = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const buckets: { label: string; day: number; count: number }[] = [];
  const now = new Date();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.push({ label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, day: d.getTime(), count: 0 });
  }
  const dayMs = 24 * 60 * 60 * 1000;
  if (range !== "all") {
    const first = buckets[0]?.day ?? 0;
    for (const t of dailyRows) {
      const idx = Math.floor((t.createdAt.getTime() - first) / dayMs);
      if (idx >= 0 && idx < buckets.length) buckets[idx].count += 1;
    }
  }

  const requesterIds = topRows.map((r) => r.requesterId);
  const assigneeIds = assigneeRows.map((r) => r.assigneeId).filter((x): x is string => Boolean(x));
  const users = await prisma.user.findMany({
    where: { id: { in: [...requesterIds, ...assigneeIds] } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const topRequesters = topRows.map((r) => ({
    id: r.requesterId,
    name: userMap.get(r.requesterId)?.name ?? "Unknown",
    email: userMap.get(r.requesterId)?.email ?? "",
    count: r._count._all,
  }));

  const workload = assigneeRows
    .filter((r) => r.assigneeId)
    .map((r) => ({
      id: r.assigneeId as string,
      name: userMap.get(r.assigneeId as string)?.name ?? "Unknown",
      count: r._count._all,
    }));

  return {
    total,
    openCount,
    closedCount,
    resolutionRate,
    avgResolutionMs,
    statusCount,
    priorityCount,
    channelCount,
    buckets,
    topRequesters,
    workload,
    byStatus: byStatus.map((r) => ({ key: r.status, count: r._count._all })),
    byPriority: byPriority.map((r) => ({ key: r.priority, count: r._count._all })),
    byChannel: byChannel.map((r) => ({ key: r.channel, count: r._count._all })),
  };
}

export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
