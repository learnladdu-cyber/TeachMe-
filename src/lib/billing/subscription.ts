import { prisma } from "@/lib/db";

export const PERIOD_DAYS = 30;
export const GRACE_DAYS = 5;

function periodEnd(from: Date, days = PERIOD_DAYS): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function getSubscription(organizationId: string) {
  return prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });
}

// Starts a fresh billing period or extends an existing one after a successful
// payment. Idempotent enough for webhook + client confirmation.
export async function startOrExtendSubscription(
  organizationId: string,
  planId: string,
  from: Date = new Date(),
) {
  const end = periodEnd(from);
  return prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      planId,
      status: "ACTIVE",
      interval: "MONTHLY",
      currentPeriodStart: from,
      currentPeriodEnd: end,
    },
    update: {
      planId,
      status: "ACTIVE",
      currentPeriodStart: from,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
      graceUntil: null,
    },
  });
}

export async function setCancelAtPeriodEnd(organizationId: string, cancel: boolean) {
  return prisma.subscription.update({
    where: { organizationId },
    data: { cancelAtPeriodEnd: cancel },
  });
}

async function freePlanId(): Promise<string | null> {
  const plan = await prisma.plan.findFirst({ where: { name: "Free" } });
  return plan?.id ?? null;
}

async function downgradeToFree(organizationId: string, status: "CANCELED" | "EXPIRED") {
  const planId = await freePlanId();
  await prisma.$transaction([
    prisma.organization.update({ where: { id: organizationId }, data: { planId } }),
    prisma.subscription.update({
      where: { organizationId },
      data: { status, planId, graceUntil: null },
    }),
    prisma.auditLog.create({
      data: {
        organizationId,
        action: "billing.subscription_downgraded",
        targetType: "Subscription",
        targetId: organizationId,
        reason: status,
      },
    }),
  ]);
}

// Advances subscriptions whose period has ended: honored cancellations downgrade
// immediately; otherwise the tenant enters a grace period and is downgraded to
// Free if unpaid after the grace window.
export async function processBillingCycle(now: Date = new Date()) {
  const due = await prisma.subscription.findMany({
    where: { currentPeriodEnd: { lt: now }, status: { in: ["ACTIVE", "PAST_DUE"] } },
  });

  let canceled = 0;
  let pastDue = 0;
  let expired = 0;

  for (const sub of due) {
    if (sub.cancelAtPeriodEnd) {
      await downgradeToFree(sub.organizationId, "CANCELED");
      canceled += 1;
      continue;
    }
    if (sub.status === "ACTIVE") {
      await prisma.subscription.update({
        where: { organizationId: sub.organizationId },
        data: {
          status: "PAST_DUE",
          graceUntil: new Date(sub.currentPeriodEnd.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000),
        },
      });
      pastDue += 1;
      continue;
    }
    if (sub.status === "PAST_DUE" && (!sub.graceUntil || sub.graceUntil < now)) {
      await downgradeToFree(sub.organizationId, "EXPIRED");
      expired += 1;
    }
  }

  return { canceled, pastDue, expired, processed: due.length };
}
