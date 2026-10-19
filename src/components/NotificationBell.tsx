import Link from "next/link";
import { getSession } from "@/lib/session";
import { unreadNotificationCount } from "@/lib/notifications";
import { Icon } from "@/components/Icon";

// Sidebar/topbar bell with an unread badge. Renders nothing when signed out.
export async function NotificationBell() {
  const session = await getSession();
  if (!session) return null;

  const count = await unreadNotificationCount(session.user.id);

  return (
    <Link href="/app/notifications" className="icon-btn" aria-label={`Notifications${count ? ` (${count} unread)` : ""}`}>
      <Icon name="bell" />
      {count > 0 && <span className="icon-badge">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
