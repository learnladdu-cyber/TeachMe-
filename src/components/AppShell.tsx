import Link from "next/link";
import { AppSidebar, type SidebarItem } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { Icon } from "@/components/Icon";

export function AppShell({
  items,
  user,
  org,
  updateAvailable,
  children,
}: {
  items: SidebarItem[];
  user: { name: string; email: string };
  org: { name: string; role: string } | null;
  updateAvailable?: number | null;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <AppSidebar items={items} user={user} org={org} />
      <div className="shell-main">
        <div className="topbar">
          <div className="topbar-spacer" />
          {updateAvailable ? (
            <Link href="/app/updates" className="update-chip" title="A newer version is available">
              <Icon name="sparkles" />
              <span>Update to v{updateAvailable}</span>
            </Link>
          ) : null}
          <NotificationBell />
        </div>
        <div className="shell-content">{children}</div>
      </div>
    </div>
  );
}
