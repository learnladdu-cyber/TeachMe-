import { dataResponse, handle } from "@/lib/api";
import { assertCron } from "@/lib/cron";
import { processBillingCycle } from "@/lib/billing/subscription";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/cron/billing — advances subscription periods, applies grace periods
// and downgrades unpaid tenants to Free.
export async function POST(request: Request) {
  return handle(async () => {
    assertCron(request);
    const result = await processBillingCycle();

    if (result.pastDue > 0 || result.expired > 0) {
      const affected = await prisma.subscription.findMany({
        where: { status: { in: ["PAST_DUE", "EXPIRED"] } },
        select: { organizationId: true, status: true },
      });
      for (const sub of affected) {
        const admins = await prisma.membership.findMany({
          where: { organizationId: sub.organizationId, role: "ORG_ADMIN", status: "ACTIVE" },
          select: { userId: true },
        });
        for (const admin of admins) {
          await notify({
            userId: admin.userId,
            organizationId: sub.organizationId,
            type: "PAYMENT",
            title:
              sub.status === "EXPIRED"
                ? "Your plan has expired"
                : "Payment due — your account is past due",
            body:
              sub.status === "EXPIRED"
                ? "Your workspace was moved to the Free plan. Upgrade any time."
                : "Update your billing to avoid losing paid features.",
            link: "/app/billing",
            dedupeKey: `billing:${sub.organizationId}:${sub.status}:${new Date().toISOString().slice(0, 10)}`,
          }).catch(() => {});
        }
      }
    }

    return dataResponse(result);
  });
}
