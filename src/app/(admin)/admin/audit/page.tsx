import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

function when(value: Date): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminAuditPage() {
  await requirePlatformAdmin();

  const [audit, events] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actor: { select: { email: true } },
        organization: { select: { name: true } },
      },
    }),
    prisma.securityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { email: true } },
        organization: { select: { name: true } },
      },
    }),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p className="page-sub">Privileged actions and authentication events across the platform.</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 22 }}>
        <h2 className="card-title">Admin &amp; tenant activity</h2>
        {audit.length === 0 ? (
          <p className="muted">No recorded activity.</p>
        ) : (
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Organization</th>
                  <th>Detail</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className="code">{a.action}</td>
                    <td>{a.actor?.email ?? <span className="muted">system</span>}</td>
                    <td>
                      {a.organization?.name ?? <span className="muted">platform</span>}
                    </td>
                    <td className="muted">{a.reason ?? "—"}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {when(a.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" id="security">
        <h2 className="card-title">
          <span className="row" style={{ gap: 8, display: "inline-flex" }}>
            <Icon name="shield" size={16} /> Security events
          </span>
        </h2>
        {events.length === 0 ? (
          <p className="muted">No security events.</p>
        ) : (
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="code">{e.type}</td>
                    <td>{e.user?.email ?? <span className="muted">—</span>}</td>
                    <td className="muted">{e.email ?? "—"}</td>
                    <td>{e.organization?.name ?? <span className="muted">—</span>}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {when(e.createdAt)}
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
