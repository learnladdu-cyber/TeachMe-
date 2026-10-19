import { requireStaff } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { getRazorpaySettings } from "@/lib/integrations/store";
import { BillingPlans } from "@/components/BillingPlans";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

function asFeatures(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

function when(value: Date): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function BillingPage() {
  const ctx = await requireStaff("ORG_ADMIN");

  const [plans, org, payments, razorpay] = await Promise.all([
    prisma.plan.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { planId: true, plan: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { plan: { select: { name: true } } },
    }),
    getRazorpaySettings(),
  ]);

  const paymentsEnabled = razorpay.enabled && razorpay.configured;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Billing &amp; plan</h1>
          <p className="page-sub">
            Current plan: <strong>{org?.plan?.name ?? "None"}</strong>. Upgrade any time — changes apply
            instantly.
          </p>
        </div>
        <span className={`badge ${paymentsEnabled ? "status-RESOLVED" : "status-CLOSED"}`}>
          <Icon name="lock" size={12} /> {paymentsEnabled ? "Payments active" : "Payments off"}
        </span>
      </div>

      <BillingPlans
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          priceMonthly: p.priceMonthly,
          currency: p.currency,
          agentLimit: p.agentLimit,
          monthlyTickets: p.monthlyTickets,
          retentionDays: p.retentionDays,
          features: asFeatures(p.features),
        }))}
        currentPlanId={org?.planId ?? null}
        paymentsEnabled={paymentsEnabled}
      />

      <section className="card" style={{ marginTop: 22 }}>
        <h2 className="card-title">Payment history</h2>
        {payments.length === 0 ? (
          <p className="muted">No payments yet.</p>
        ) : (
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="code">{p.orderId ?? p.id.slice(0, 8)}</td>
                    <td>{p.plan?.name ?? "—"}</td>
                    <td>
                      {p.currency === "INR" ? "₹" : ""}
                      {(p.amount / 100).toLocaleString()} {p.currency}
                    </td>
                    <td>
                      <span className={`badge ${p.status === "paid" ? "status-RESOLVED" : "status-PENDING"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {when(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
