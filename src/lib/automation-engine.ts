import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { asActions, asConditions, matchesConditions, type RuleAction } from "@/lib/automation";
import { notify } from "@/lib/notifications";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { applySlaToTicket } from "@/lib/sla";

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const STATUSES = ["NEW", "OPEN", "PENDING", "ON_HOLD", "RESOLVED", "CLOSED"];

async function pickLeastLoadedAgent(organizationId: string): Promise<string | null> {
  const agents = await prisma.membership.findMany({
    where: { organizationId, role: { in: ["AGENT", "TEAM_LEAD"] }, status: "ACTIVE" },
    select: { userId: true, user: { select: { name: true, email: true } } },
  });
  if (agents.length === 0) return null;
  const loads = await prisma.ticket.groupBy({
    by: ["assigneeId"],
    where: { organizationId, status: { notIn: ["RESOLVED", "CLOSED"] }, assigneeId: { not: null } },
    _count: { _all: true },
  });
  const loadMap = new Map(loads.map((l) => [l.assigneeId as string, l._count._all]));
  agents.sort((a, b) => (loadMap.get(a.userId) ?? 0) - (loadMap.get(b.userId) ?? 0));
  return agents[0].userId;
}

async function applyAction(
  organizationId: string,
  ticketId: string,
  action: RuleAction,
): Promise<{ type: string; value: string; ok: boolean }> {
  const value = String(action.value ?? "");
  try {
    switch (action.type) {
      case "set_priority": {
        const priority = value.toUpperCase();
        if (!PRIORITIES.includes(priority)) return { type: action.type, value, ok: false };
        await prisma.ticket.update({ where: { id: ticketId }, data: { priority: priority as never } });
        return { type: action.type, value, ok: true };
      }
      case "set_status": {
        const status = value.toUpperCase();
        if (!STATUSES.includes(status)) return { type: action.type, value, ok: false };
        await prisma.ticket.update({
          where: { id: ticketId },
          data: {
            status: status as never,
            resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
          },
        });
        return { type: action.type, value, ok: true };
      }
      case "assign": {
        const assigneeId = value === "auto" ? await pickLeastLoadedAgent(organizationId) : value;
        if (!assigneeId) return { type: action.type, value, ok: false };
        const membership = await prisma.membership.findFirst({
          where: { organizationId, userId: assigneeId, status: "ACTIVE" },
        });
        if (!membership) return { type: action.type, value, ok: false };
        await prisma.ticket.update({ where: { id: ticketId }, data: { assigneeId } });
        return { type: action.type, value: assigneeId, ok: true };
      }
      case "add_tag": {
        if (!value) return { type: action.type, value, ok: false };
        const tag = await prisma.tag.upsert({
          where: { organizationId_name: { organizationId, name: value } },
          update: {},
          create: { organizationId, name: value },
        });
        await prisma.ticketTag.upsert({
          where: { ticketId_tagId: { ticketId, tagId: tag.id } },
          update: {},
          create: { ticketId, tagId: tag.id },
        });
        return { type: action.type, value, ok: true };
      }
      case "notify": {
        const ticket = await prisma.ticket.findFirst({
          where: { id: ticketId, organizationId },
          select: { publicId: true, subject: true, assigneeId: true },
        });
        const recipients = await prisma.membership.findMany({
          where: { organizationId, role: { in: ["TEAM_LEAD", "ORG_ADMIN"] }, status: "ACTIVE" },
          select: { userId: true },
        });
        const targets = new Set(recipients.map((r) => r.userId));
        if (ticket?.assigneeId) targets.add(ticket.assigneeId);
        for (const userId of targets) {
          await notify({
            userId,
            organizationId,
            type: "SYSTEM",
            title: value || "Automation notification",
            body: ticket ? `${ticket.publicId}: ${ticket.subject}` : undefined,
            link: ticket ? `/app/tickets/${ticketId}` : undefined,
            dedupeKey: `automation:${ticketId}:${action.type}:${value}`,
          });
        }
        return { type: action.type, value, ok: true };
      }
      default:
        return { type: action.type, value, ok: false };
    }
  } catch {
    return { type: action.type, value, ok: false };
  }
}

// Evaluates automation rules for a trigger and applies matching actions.
// Actions use direct updates (not the ticket service) so they never re-trigger
// the engine — this is the loop-prevention boundary.
export async function runAutomations(
  organizationId: string,
  ticketId: string,
  trigger: string,
): Promise<number> {
  const rules = await prisma.automationRule.findMany({
    where: { organizationId, enabled: true, trigger },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  if (rules.length === 0) return 0;

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId },
    select: { id: true, priority: true, channel: true, status: true, subject: true },
  });
  if (!ticket) return 0;

  let appliedCount = 0;

  for (const rule of rules) {
    const conditions = asConditions(rule.conditions);
    const matched = matchesConditions(conditions, ticket);
    const results: { type: string; value: string; ok: boolean }[] = [];

    if (matched) {
      for (const action of asActions(rule.actions)) {
        results.push(await applyAction(organizationId, ticketId, action));
      }
    }

    await prisma.automationRun.create({
      data: {
        organizationId,
        ruleId: rule.id,
        ticketId,
        trigger,
        status: matched ? "applied" : "skipped",
        actionsJson: results as unknown as Prisma.InputJsonValue,
      },
    });
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });

    if (matched && results.some((r) => r.ok)) appliedCount += 1;
  }

  if (appliedCount > 0) {
    await prisma.ticketEvent.create({
      data: {
        organizationId,
        ticketId,
        eventType: "automation.applied",
        afterJson: { count: appliedCount, trigger },
      },
    });
    await applySlaToTicket(organizationId, ticketId).catch(() => {});
    await emitEvent(organizationId, "ticket.updated", { ticketId, trigger, automated: true }).catch(() => {});
  }

  return appliedCount;
}
