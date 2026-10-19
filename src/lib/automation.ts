import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type RuleCondition = {
  field: "priority" | "channel" | "status" | "subject";
  operator: "equals" | "contains";
  value: string;
};

export type RuleAction = {
  type: "set_priority" | "set_status" | "assign" | "add_tag" | "notify";
  value: string;
};

export const TRIGGERS = [
  { key: "ticket.created", label: "Ticket created" },
  { key: "ticket.updated", label: "Ticket updated" },
  { key: "message.public", label: "Customer reply received" },
] as const;

export const CONDITION_FIELDS = ["priority", "channel", "status", "subject"] as const;
export const ACTIONS = [
  { key: "set_priority", label: "Set priority" },
  { key: "set_status", label: "Set status" },
  { key: "assign", label: "Assign to agent" },
  { key: "add_tag", label: "Add tag" },
  { key: "notify", label: "Notify team" },
] as const;

export function triggerLabel(trigger: string) {
  return TRIGGERS.find((t) => t.key === trigger)?.label ?? trigger;
}

export function actionLabel(type: string) {
  return ACTIONS.find((a) => a.key === type)?.label ?? type;
}

export function asConditions(value: Prisma.JsonValue): RuleCondition[] {
  return Array.isArray(value) ? (value as unknown as RuleCondition[]) : [];
}

export function asActions(value: Prisma.JsonValue): RuleAction[] {
  return Array.isArray(value) ? (value as unknown as RuleAction[]) : [];
}

export async function listRules(organizationId: string) {
  return prisma.automationRule.findMany({
    where: { organizationId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

export async function createRule(
  organizationId: string,
  input: {
    name: string;
    trigger: string;
    conditions: RuleCondition[];
    actions: RuleAction[];
  },
) {
  const count = await prisma.automationRule.count({ where: { organizationId } });
  return prisma.automationRule.create({
    data: {
      organizationId,
      name: input.name,
      trigger: input.trigger,
      conditions: input.conditions as unknown as Prisma.InputJsonValue,
      actions: input.actions as unknown as Prisma.InputJsonValue,
      position: count,
    },
  });
}

export async function setRuleEnabled(organizationId: string, id: string, enabled: boolean) {
  const rule = await prisma.automationRule.findFirst({ where: { id, organizationId } });
  if (!rule) throw new Error("Rule not found");
  return prisma.automationRule.update({ where: { id }, data: { enabled } });
}

export async function deleteRule(organizationId: string, id: string) {
  const rule = await prisma.automationRule.findFirst({ where: { id, organizationId } });
  if (!rule) throw new Error("Rule not found");
  await prisma.automationRule.delete({ where: { id } });
}

type TicketLike = {
  priority: string;
  channel: string;
  status: string;
  subject: string;
};

export function matchesConditions(conditions: RuleCondition[], ticket: TicketLike): boolean {
  return conditions.every((c) => {
    const actual = String(ticket[c.field as keyof TicketLike] ?? "").toLowerCase();
    const expected = c.value.toLowerCase();
    return c.operator === "contains" ? actual.includes(expected) : actual === expected;
  });
}

// Dry-run: count how many of the most recent tickets a rule would match.
export async function countMatches(organizationId: string, ruleId: string) {
  const rule = await prisma.automationRule.findFirst({ where: { id: ruleId, organizationId } });
  if (!rule) return 0;
  const conditions = asConditions(rule.conditions);
  const recent = await prisma.ticket.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { priority: true, channel: true, status: true, subject: true },
  });
  return recent.filter((t) => matchesConditions(conditions, t)).length;
}
