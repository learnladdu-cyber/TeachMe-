import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

function when(value: Date | string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();

  const [
    orgCount,
    userCount,
    ticketCount,
    chatCount,
    suspendedCount,
    recentOrgs,
    recentUsers,
    recentAudit,
    recentEvents,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.ticket.count(),
    prisma.chatConversation.count(),
    prisma.organization.count({ where: { status: "SUSPENDED" } }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        plan: { select: { name: true } },
        _count: { select: { members: true, tickets: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { _count: { select: { memberships: true } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        actor: { select: { name: true, email: true } },
        organization: { select: { name: true } },
      },
    }),
    prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const kpis = [
    { label: "Tenants", value: orgCount, icon: "building" as const, tone: "gold" },
    { label: "Users", value: userCount, icon: "users" as const, tone: "" },
    { label: "Tickets", value: ticketCount, icon: "ticket" as const, tone: "amber" },
    { label: "Chats", value: chatCount, icon: "chat" as const, tone: "green" },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Platform overview</h1>
          <p className="page-sub">
            Cross-tenant control panel. Access is privileged and fully audited.
          </p>
        </div>
        <span className="badge status-NEW">
          <Icon name="shield" size={12} /> Platform admin
        </span>
      </div>

      <div className="kpis" style={{ marginBottom: 22 }}>
        {kpis.map((k) => (
          <div className="stat-card" key={k.label}>
            <span className={`stat-icon ${k.tone}`}>
              <Icon name={k.icon} />
            </span>
            <div>
              <div className="stat-label">{k.label}</div>
              <div className="stat-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {suspendedCount > 0 && (
        <div className="alert error" style={{ marginBottom: 22 }}>
          <Icon name="alert" />
          <span>
            {suspendedCount} suspended tenant{suspendedCount === 1 ? "" : "s"}.{" "}
            <Link href="/admin/organizations?status=SUSPENDED">Review</Link>
          </span>
        </div>
      )}

      <div className="grid cols-2" style={{ gap: 22 }}>
        <section className="card">
          <div className="card-head">
            <h2 style={{ margin: 0, fontSize: 16 }}>Newest organizations</h2>
            <Link href="/admin/organizations" className="btn secondary sm">
              View all
            </Link>
          </div>
          {recentOrgs.length === 0 ? (
            <p className="muted">No organizations yet.</p>
          ) : (
            <div className="mini-list">
              {recentOrgs.map((o) => (
                <Link key={o.id} href={`/admin/organizations/${o.id}`} className="mini-row">
                  <Avatar name={o.name} />
                  <div style={{ minWidth: 0 }}>
                    <div className="mini-title">{o.name}</div>
                    <div className="cell-sub">
                      {o.plan?.name ?? "No plan"} · {o._count.members} member
                      {o._count.members === 1 ? "" : "s"} · {o._count.tickets} ticket
                      {o._count.tickets === 1 ? "" : "s"}
                    </div>
                  </div>
                  <span className={`badge ${o.status === "ACTIVE" ? "status-RESOLVED" : "prio-URGENT"}`}>
                    {o.status.toLowerCase()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2 style={{ margin: 0, fontSize: 16 }}>Newest users</h2>
            <Link href="/admin/users" className="btn secondary sm">
              View all
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="muted">No users yet.</p>
          ) : (
            <div className="mini-list">
              {recentUsers.map((u) => (
                <div key={u.id} className="mini-row">
                  <Avatar name={u.name} />
                  <div style={{ minWidth: 0 }}>
                    <div className="mini-title">{u.name}</div>
                    <div className="cell-sub code">{u.email}</div>
                  </div>
                  {u.isPlatformAdmin ? (
                    <span className="badge no-dot role-platform">admin</span>
                  ) : (
                    <span className="cell-sub">{u._count.memberships} org(s)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid cols-2" style={{ gap: 22, marginTop: 22 }}>
        <section className="card">
          <div className="card-head">
            <h2 style={{ margin: 0, fontSize: 16 }}>Recent admin activity</h2>
            <Link href="/admin/audit" className="btn secondary sm">
              Audit log
            </Link>
          </div>
          {recentAudit.length === 0 ? (
            <p className="muted">No recorded activity.</p>
          ) : (
            <div className="mini-list">
              {recentAudit.map((a) => (
                <div key={a.id} className="mini-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="mini-title code">{a.action}</div>
                    <div className="cell-sub">
                      {a.actor?.email ?? "system"}
                      {a.organization ? ` · ${a.organization.name}` : ""}
                    </div>
                  </div>
                  <span className="cell-sub" style={{ whiteSpace: "nowrap" }}>
                    {when(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2 style={{ margin: 0, fontSize: 16 }}>Security events</h2>
            <Link href="/admin/audit#security" className="btn secondary sm">
              View all
            </Link>
          </div>
          {recentEvents.length === 0 ? (
            <p className="muted">No security events.</p>
          ) : (
            <div className="mini-list">
              {recentEvents.map((e) => (
                <div key={e.id} className="mini-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="mini-title code">{e.type}</div>
                    <div className="cell-sub">{e.email ?? "—"}</div>
                  </div>
                  <span className="cell-sub" style={{ whiteSpace: "nowrap" }}>
                    {when(e.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
