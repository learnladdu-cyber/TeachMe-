import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { listNotifications } from "@/lib/notifications";
import { Icon } from "@/components/Icon";
import { markAllReadAction } from "./actions";

export const dynamic = "force-dynamic";

const TYPE_ICON = {
  TICKET_CREATED: "ticket",
  TICKET_ASSIGNED: "user",
  TICKET_REPLIED: "chat",
  TICKET_RESOLVED: "check",
  SLA_BREACH: "clock",
  CSAT: "sparkles",
  INVITE: "mail",
  PAYMENT: "life-buoy",
  MENTION: "chat",
  SYSTEM: "bolt",
} as const;

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function NotificationsPage() {
  const ctx = await requireStaff("AGENT");
  const items = await listNotifications(ctx.session.user.id, 60);
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p className="page-sub">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button className="btn secondary" type="submit">
              <Icon name="check" /> Mark all read
            </button>
          </form>
        )}
      </div>

      <div className="card flush">
        {items.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>
            Nothing here yet. Ticket and billing activity will show up here.
          </p>
        ) : (
          <div className="mini-list" style={{ padding: 8 }}>
            {items.map((n) => (
              <div className={`mini-row${n.readAt ? "" : " unread"}`} key={n.id}>
                <div className="cell-user">
                  <span className="stat-icon">
                    <Icon name={TYPE_ICON[n.type]} />
                  </span>
                  <div>
                    <div className="mini-title">{n.title}</div>
                    {n.body && <div className="cell-sub">{n.body}</div>}
                    <div className="cell-sub">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {n.link && (
                    <Link className="btn secondary sm" href={n.link}>
                      Open
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
