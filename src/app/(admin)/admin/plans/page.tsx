import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

function asFeatures(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  return [];
}

export default async function AdminPlansPage() {
  await requirePlatformAdmin();

  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { organizations: true } } },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Plans</h1>
          <p className="page-sub">
            The plan catalog available to tenants. Seeded by <span className="code">npm run db:seed</span>.
          </p>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="empty">
          <h3>No plans defined</h3>
          <p>Run the seed to install the plan catalog.</p>
        </div>
      ) : (
        <div className="grid cols-2">
          {plans.map((p) => (
            <section className="card" key={p.id}>
              <div className="card-head">
                <h2 style={{ margin: 0, fontSize: 17 }}>{p.name}</h2>
                <span className="badge no-dot status-OPEN">
                  <Icon name="building" size={12} /> {p._count.organizations} tenant
                  {p._count.organizations === 1 ? "" : "s"}
                </span>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                <div className="row between">
                  <span className="muted">Agent limit</span>
                  <span>{p.agentLimit ?? "Unlimited"}</span>
                </div>
                <div className="row between">
                  <span className="muted">Monthly tickets</span>
                  <span>{p.monthlyTickets?.toLocaleString() ?? "Unlimited"}</span>
                </div>
                <div className="row between">
                  <span className="muted">Retention</span>
                  <span>{p.retentionDays ? `${p.retentionDays} days` : "—"}</span>
                </div>
              </div>
              <div className="divider" />
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {asFeatures(p.features).length === 0 ? (
                  <span className="muted">No features listed.</span>
                ) : (
                  asFeatures(p.features).map((f) => (
                    <span className="badge no-dot status-CLOSED" key={f}>
                      {f}
                    </span>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
