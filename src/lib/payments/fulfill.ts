import { prisma } from "@/lib/db";
import { startOrExtendSubscription } from "@/lib/billing/subscription";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { sendLoggedEmail } from "@/lib/notifications";
import { shell } from "@/lib/email/templates";
import { escapeHtml } from "@/lib/security/sanitize";

// Applies a successful payment: marks it paid and upgrades the tenant's plan.
// Idempotent so webhook + client confirmation can both call it.
export async function fulfillPayment(input: {
  orderId: string;
  paymentId?: string | null;
}): Promise<{ ok: boolean; reason?: string; duplicate?: boolean }> {
  const payment = await prisma.payment.findUnique({ where: { orderId: input.orderId } });
  if (!payment) return { ok: false, reason: "unknown_order" };
  if (payment.status === "paid") return { ok: true, duplicate: true };

  try {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "paid", paymentId: input.paymentId ?? payment.paymentId ?? null },
      }),
      ...(payment.planId
        ? [
            prisma.organization.update({
              where: { id: payment.organizationId },
              data: { planId: payment.planId },
            }),
          ]
        : []),
      prisma.auditLog.create({
        data: {
          organizationId: payment.organizationId,
          action: "billing.payment_paid",
          targetType: "Payment",
          targetId: payment.id,
          reason: `${payment.amount} ${payment.currency} via ${payment.provider}`,
        },
      }),
    ]);
  } catch (error) {
    console.error("[billing] fulfillment failed", error);
    return { ok: false, reason: "fulfillment_failed" };
  }

  if (payment.planId) {
    await startOrExtendSubscription(payment.organizationId, payment.planId).catch(() => {});
  }

  await emitEvent(payment.organizationId, "payment.paid", {
    orderId: input.orderId,
    paymentId: input.paymentId ?? null,
    amount: payment.amount,
    currency: payment.currency,
  }).catch(() => {});

  const admins = await prisma.membership.findMany({
    where: { organizationId: payment.organizationId, role: "ORG_ADMIN", status: "ACTIVE" },
    select: { user: { select: { email: true } } },
  });
  for (const admin of admins) {
    await sendLoggedEmail({
      to: admin.user.email,
      template: "payment_receipt",
      organizationId: payment.organizationId,
      subject: "Payment received",
      html: shell(
        "Payment received",
        `<p>We received your payment of <strong>${escapeHtml(
          `${payment.currency} ${(payment.amount / 100).toLocaleString()}`,
        )}</strong>. Your workspace has been upgraded.</p>`,
      ),
      text: `Payment of ${payment.currency} ${payment.amount / 100} received.`,
    }).catch(() => {});
  }

  return { ok: true };
}
