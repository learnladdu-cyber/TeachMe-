import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveContext } from "@/lib/auth";
import { listTickets } from "@/lib/tickets";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { Icon } from "@/components/Icon";
import { ArtEmpty } from "@/components/illustrations";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

function when(value: Date | string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PortalPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");

  const tickets = await listTickets(ctx.organizationId, ctx.session.user.id, ctx.role);
  const open = tickets.filter((t) => !["RESOLVED", "CLOSED"].includes(t.status));
  const resolved = tickets.filter((t) => ["RESOLVED", "CLOSED"].includes(t.status));
  const orgName =
    ctx.session.memberships.find((m) => m.organizationId === ctx.organizationId)?.organization
      .name ?? "—";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My support</h1>
          <p className="page-sub">
            {ctx.session.user.name} · {open.length} open request{open.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="page-actions">
          <Link href="/portal/tickets/new" className="btn">
            <Icon name="plus" /> New ticket
          </Link>
        </div>
      </div>

      <div className="kpis" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="inbox" />
          </span>
          <div>
            <div className="stat-label">Open</div>
            <div className="stat-value">{open.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <Icon name="check" />
          </span>
          <div>
            <div className="stat-label">Resolved</div>
            <div className="stat-value">{resolved.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="ticket" />
          </span>
          <div>
            <div className="stat-label">Total requests</div>
            <div className="stat-value">{tickets.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon amber">
            <Icon name="building" />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="stat-label">Organization</div>
            <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {orgName}
            </div>
          </div>
        </div>
      </div>

      <div className="page-head" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Recent requests</h2>
      </div>

      {tickets.length === 0 ? (
        <div className="empty">
          <ArtEmpty />
          <h3>No requests yet</h3>
          <p>Create your first ticket and our team will get back to you.</p>
          <Link href="/portal/tickets/new" className="btn">
            <Icon name="plus" /> Create a ticket
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/portal/tickets/${t.id}`} className="ticket-link">
                      {t.subject}
                    </Link>
                    <div className="cell-sub code">{t.publicId}</div>
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>
                    {when(t.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: 24, display: "flex", gap: 14, alignItems: "center" }}>
        <Avatar name={ctx.session.user.name} size="lg" />
        <div style={{ flex: 1 }}>
          <strong>Need an answer immediately?</strong>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 13.5 }}>
            Browse the knowledge base for setup guides, billing questions and troubleshooting.
          </p>
        </div>
        <Link href="/features" className="btn secondary">
          <Icon name="book" /> Help center
        </Link>
      </div>
    </>
  );
}
