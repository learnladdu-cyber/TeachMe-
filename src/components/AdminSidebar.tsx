"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
};

export function AdminSidebar({
  items,
  user,
}: {
  items: AdminNavItem[];
  user: { name: string; email: string };
}) {
  const pathname = usePathname();

  function isActive(item: AdminNavItem) {
    const path = item.href.split("?")[0];
    if (item.exact) return pathname === path;
    return pathname === path || pathname.startsWith(path + "/");
  }

  return (
    <aside className="sidebar">
      <Link href="/admin" className="logo">
        <span className="logo-mark">
          <Icon name="shield" />
        </span>
        <span>HelpDeskFlow</span>
      </Link>

      <div className="sidebar-org">
        <span className="org-mark">
          <Icon name="shield" size={17} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="org-label">Platform</div>
          <div className="org-name">Administration</div>
          <div className="org-role">privileged access</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`nav-item${isActive(item) ? " active" : ""}`}
          >
            <Icon name={item.icon} />
            <span className="label">{item.label}</span>
          </Link>
        ))}
        <Link href="/app" className="nav-item">
          <Icon name="dashboard" />
          <span className="label">Back to workspace</span>
        </Link>
      </nav>

      <div className="sidebar-foot">
        <div className="user-card">
          <Avatar name={user.name} />
          <div className="user-meta">
            <div className="user-name">{user.name}</div>
            <div className="user-mail">{user.email}</div>
          </div>
          <LogoutButton iconOnly />
        </div>
      </div>
    </aside>
  );
}
