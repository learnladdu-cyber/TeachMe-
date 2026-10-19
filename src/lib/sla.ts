import { prisma } from "@/lib/db";
import { sanitizeSingleLine } from "@/lib/security/sanitize";

export const DEFAULT_FIRST_RESPONSE_MINS = 60;
export const DEFAULT_RESOLUTION_MINS = 480;

export type BusinessHours = { enabled?: boolean; days?: number[]; start?: number; end?: number };

export function parseBusinessHours(value: unknown): BusinessHours {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as BusinessHours;
  return {};
}

// Adds `minutes` of SLA time to `from`. When business hours are enabled, only
// time inside the configured window (UTC) counts toward the target.
export function addSlaMinutes(from: Date, minutes: number, bh: BusinessHours): Date {
  if (!bh.enabled) return new Date(from.getTime() + minutes * 60_000);

  const days = bh.days && bh.days.length > 0 ? bh.days : [1, 2, 3, 4, 5];
  const start = Math.max(0, Math.min(23, bh.start ?? 9));
  const end = Math.max(start + 1, Math.min(24, bh.end ?? 17));

  let cursor = new Date(from.getTime());
  let remaining = minutes;

  for (let guard = 0; guard < 400 && remaining > 0; guard += 1) {
    if (days.includes(cursor.getUTCDay())) {
      const windowStart = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), start),
      );
      const windowEnd = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), end),
      );
      if (cursor < windowStart) cursor = windowStart;
      if (cursor < windowEnd) {
        const available = (windowEnd.getTime() - cursor.getTime()) / 60_000;
        const use = Math.min(available, remaining);
        remaining -= use;
        cursor = new Date(cursor.getTime() + use * 60_000);
        if (remaining <= 0) break;
      }
    }
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1, start),
    );
  }
  return cursor;
}

export type ResolvedSla = {
  policyId: string | null;
  name: string;
  firstResponseMins: number;
  resolutionMins: number;
  businessHours: BusinessHours;
};

export async function getDefaultSlaPolicy(organizationId: string): Promise<ResolvedSla> {
  const policy =
    (await prisma.slaPolicy.findFirst({ where: { organizationId, isDefault: true } })) ??
    (await prisma.slaPolicy.findFirst({ where: { organizationId }, orderBy: { createdAt: "asc" } }));

  if (policy) {
    return {
      policyId: policy.id,
      name: policy.name,
      firstResponseMins: policy.firstResponseMins,
      resolutionMins: policy.resolutionMins,
      businessHours: parseBusinessHours(policy.businessHours),
    };
  }

  return {
    policyId: null,
    name: "Default",
    firstResponseMins: DEFAULT_FIRST_RESPONSE_MINS,
    resolutionMins: DEFAULT_RESOLUTION_MINS,
    businessHours: {},
  };
}

// Applies SLA targets to a ticket, setting first-response and resolution due
// dates from the organization's default policy.
export async function applySlaToTicket(
  organizationId: string,
  ticketId: string,
  from: Date = new Date(),
): Promise<void> {
  const sla = await getDefaultSlaPolicy(organizationId);
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      slaPolicyId: sla.policyId,
      firstResponseDueAt: addSlaMinutes(from, sla.firstResponseMins, sla.businessHours),
      dueAt: addSlaMinutes(from, sla.resolutionMins, sla.businessHours),
    },
  });
}

// Records the first staff response for SLA purposes. Idempotent.
export async function markFirstResponse(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { firstResponseAt: true },
  });
  if (!ticket || ticket.firstResponseAt) return;
  await prisma.ticket.update({ where: { id: ticketId }, data: { firstResponseAt: new Date() } });
}

export type SlaBreach = {
  ticketId: string;
  organizationId: string;
  publicId: string;
  subject: string;
  assigneeId: string | null;
  kind: "first_response" | "resolution";
};

// Finds tickets that have breached an SLA target and flags them. Returns the
// newly-flagged breaches so callers can notify/escalate.
export async function sweepSla(limit = 200): Promise<SlaBreach[]> {
  const now = new Date();
  const candidates = await prisma.ticket.findMany({
    where: {
      slaBreachedAt: null,
      status: { notIn: ["RESOLVED", "CLOSED"] },
      OR: [
        { firstResponseAt: null, firstResponseDueAt: { lt: now } },
        { dueAt: { lt: now } },
      ],
    },
    select: {
      id: true,
      organizationId: true,
      publicId: true,
      subject: true,
      assigneeId: true,
      firstResponseAt: true,
      firstResponseDueAt: true,
      dueAt: true,
    },
    take: limit,
  });

  const breaches: SlaBreach[] = [];
  for (const t of candidates) {
    const kind: SlaBreach["kind"] =
      t.firstResponseAt === null && t.firstResponseDueAt && t.firstResponseDueAt < now
        ? "first_response"
        : "resolution";
    const updated = await prisma.ticket.updateMany({
      where: { id: t.id, slaBreachedAt: null },
      data: { slaBreachedAt: now },
    });
    if (updated.count > 0) {
      breaches.push({
        ticketId: t.id,
        organizationId: t.organizationId,
        publicId: t.publicId,
        subject: t.subject,
        assigneeId: t.assigneeId,
        kind,
      });
      await prisma.ticketEvent.create({
        data: {
          organizationId: t.organizationId,
          ticketId: t.id,
          eventType: "sla.breached",
          afterJson: { kind },
        },
      });
    }
  }
  return breaches;
}

export async function listSlaPolicies(organizationId: string) {
  return prisma.slaPolicy.findMany({
    where: { organizationId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function createSlaPolicy(input: {
  organizationId: string;
  name: string;
  firstResponseMins: number;
  resolutionMins: number;
  businessHours?: BusinessHours;
}) {
  const existing = await prisma.slaPolicy.count({ where: { organizationId: input.organizationId } });
  return prisma.slaPolicy.create({
    data: {
      organizationId: input.organizationId,
      name: sanitizeSingleLine(input.name, 80),
      firstResponseMins: Math.max(1, Math.round(input.firstResponseMins)),
      resolutionMins: Math.max(1, Math.round(input.resolutionMins)),
      businessHours: (input.businessHours ?? {}) as never,
      isDefault: existing === 0,
    },
  });
}

export async function updateSlaPolicy(
  organizationId: string,
  id: string,
  input: { name: string; firstResponseMins: number; resolutionMins: number; businessHours?: BusinessHours },
) {
  const policy = await prisma.slaPolicy.findFirst({ where: { id, organizationId } });
  if (!policy) throw new Error("SLA policy not found");
  return prisma.slaPolicy.update({
    where: { id },
    data: {
      name: sanitizeSingleLine(input.name, 80),
      firstResponseMins: Math.max(1, Math.round(input.firstResponseMins)),
      resolutionMins: Math.max(1, Math.round(input.resolutionMins)),
      businessHours: (input.businessHours ?? {}) as never,
    },
  });
}

export async function setDefaultSlaPolicy(organizationId: string, id: string) {
  const policy = await prisma.slaPolicy.findFirst({ where: { id, organizationId } });
  if (!policy) throw new Error("SLA policy not found");
  await prisma.$transaction([
    prisma.slaPolicy.updateMany({ where: { organizationId }, data: { isDefault: false } }),
    prisma.slaPolicy.update({ where: { id }, data: { isDefault: true } }),
  ]);
}

export async function deleteSlaPolicy(organizationId: string, id: string) {
  await prisma.slaPolicy.deleteMany({ where: { id, organizationId } });
}
