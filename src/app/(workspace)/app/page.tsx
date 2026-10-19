import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveContext } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { listTickets, ticketStatusCounts } from "@/lib/tickets";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { ArtEmpty } from "@/components/illustrations";
import type { TicketStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function when(value: Date | string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; assigned?: string; q?: string }>;
}) {
  const ctx = await getActiveContext();
  if (!ctx) {
    const session = await getSession();
    redirect(session?.user.isPlatformAdmin ? "/admin" : "/login");
  }
  if (ctx.role === "CUSTOMER") redirect("/portal");

  const sp = await searchParams;
  const status = (sp.status as TicketStatus | undefined) || undefined;
  const assignedToMe = sp.assigned === "me";
  const q = sp.q;

  const [tickets, counts, assignedToMeTickets] = await Promise.all([
    listTickets(ctx.organizationId, ctx.session.user.id, ctx.role, { status, assignedToMe, q }),
    ticketStatusCounts(ctx.organizationId),
    listTickets(ctx.organizationId, ctx.session.user.id, ctx.role, { assignedToMe: true }),
  ]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const queues: { label: string; href: string; count?: number; active: boolean }[] = [
    { label: "All", href: "/app", count: total, active: !status && !assignedToMe },
    { label: "New", href: "/app?status=NEW", count: counts.NEW ?? 0, active: status === "NEW" },
    { label: "Open", href: "/app?status=OPEN", count: counts.OPEN ?? 0, active: status === "OPEN" },
    { label: "Pending", href: "/app?status=PENDING", count: counts.PENDING ?? 0, active: status === "PENDING" },
    { label: "Resolved", href: "/app?status=RESOLVED", count: counts.RESOLVED ?? 0, active: status === "RESOLVED" },
    { label: "Assigned to me", href: "/app?assigned=me", count: assignedToMeTickets.length, active: assignedToMe },
  ];

  const orgName =
    ctx.session.memberships.find((m) => m.organizationId === ctx.organizationId)?.organization
      .name ?? ctx.organizationId;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Unified inbox</h1>
          <p className="page-sub">
            {orgName} · signed in as{" "}
            {(ctx.session.user.isPlatformAdmin ? "PLATFORM_ADMIN" : ctx.role)
              .replace("_", " ")
              .toLowerCase()}
          </p>
        </div>
        <form className="row" action="/app" method="get" style={{ gap: 8 }}>
          <div style={{ position: "relative" }}>
            <span
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
            >
              <Icon name="search" size={16} />
            </span>
            <input
              name="q"
              placeholder="Search subject or ID"
              defaultValue={q ?? ""}
              style={{ width: 240, paddingLeft: 36 }}
            />
          </div>
          <button className="btn secondary" type="submit">
            Search
          </button>
        </form>
      </div>

      <div className="kpis" style={{ marginBottom: 22 }}>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="sparkles" />
          </span>
          <div>
            <div className="stat-label">New</div>
            <div className="stat-value">{counts.NEW ?? 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="inbox" />
          </span>
          <div>
            <div className="stat-label">Open</div>
            <div className="stat-value">{counts.OPEN ?? 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon amber">
            <Icon name="clock" />
          </span>
          <div>
            <div className="stat-label">Pending</div>
            <div className="stat-value">{counts.PENDING ?? 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <Icon name="user" />
          </span>
          <div>
            <div className="stat-label">Assigned to me</div>
            <div className="stat-value">{assignedToMeTickets.length}</div>
          </div>
        </div>
      </div>

      <div className="filters">
        {queues.map((queue) => (
          <Link
            key={queue.label}
            href={queue.href}
            className={`chip${queue.active ? " active" : ""}`}
          >
            {queue.label}
            {typeof queue.count === "number" && <span className="count">{queue.count}</span>}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="empty">
          <ArtEmpty />
          <h3>No tickets in this view</h3>
          <p>Try a different queue or clear your search.</p>
          <Link href="/app" className="btn secondary">
            Show all tickets
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Requester</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/app/tickets/${t.id}`} className="ticket-link">
                      {t.subject}
                    </Link>
                    <div className="cell-sub code">
                      {t.publicId} · {t._count.messages} message{t._count.messages === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td>
                    <div className="cell-user">
                      <Avatar name={t.requester.name} />
                      <span style={{ fontSize: 13.5 }}>{t.requester.name}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td>
                    {t.assignee ? (
                      <div className="cell-user">
                        <Avatar name={t.assignee.name} />
                        <span style={{ fontSize: 13.5 }}>{t.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
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
    </>
  );
}
