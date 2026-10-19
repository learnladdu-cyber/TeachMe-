import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { listNotifications } from "@/lib/notifications";
import { Icon, type IconName } from "@/components/Icon";
import { markAllReadAction } from "./actions";

export const dynamic = "force-dynamic";

const TYPE_ICON: Record<string, IconName> = {
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
};

const TYPE_TONE: Record<string, string> = {
  TICKET_CREATED: "brand",
  TICKET_ASSIGNED: "brand",
  TICKET_REPLIED: "brand",
  TICKET_RESOLVED: "green",
  SLA_BREACH: "rose",
  CSAT: "gold",
  INVITE: "brand",
  PAYMENT: "amber",
  MENTION: "brand",
  SYSTEM: "brand",
};

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
            {items.length === 0
              ? "Ticket and billing activity will show up here."
              : unread > 0
                ? `${unread} unread · ${items.length} total`
                : `You're all caught up · ${items.length} total`}
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

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <Icon name="bell" />
          </div>
          <h3>Nothing here yet</h3>
          <p>When a ticket is assigned, replied to, or a payment is processed, you&apos;ll see it here.</p>
        </div>
      ) : (
        <ul className="notif-list">
          {items.map((n) => (
            <li key={n.id} className={`notif-row${n.readAt ? "" : " unread"}`}>
              <span className={`notif-icon tone-${TYPE_TONE[n.type] ?? "brand"}`}>
                <Icon name={TYPE_ICON[n.type] ?? "bell"} />
              </span>
              <div className="notif-main">
                <div className="notif-top">
                  <span className="notif-title">{n.title}</span>
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </div>
                {n.body && <p className="notif-body">{n.body}</p>}
              </div>
              <div className="notif-actions">
                {!n.readAt && <span className="notif-dot" title="Unread" aria-label="Unread" />}
                {n.link && (
                  <Link className="btn secondary sm" href={n.link}>
                    Open
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
