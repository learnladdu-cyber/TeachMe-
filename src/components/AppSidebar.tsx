"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";

export type SidebarItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  disabled?: boolean;
};

export function AppSidebar({
  items,
  user,
  org,
}: {
  items: SidebarItem[];
  user: { name: string; email: string };
  org: { name: string; role: string } | null;
}) {
  const pathname = usePathname();

  function isActive(item: SidebarItem) {
    if (item.disabled) return false;
    const path = item.href.split("?")[0];
    if (item.exact) return pathname === path;
    return pathname === path || pathname.startsWith(path + "/");
  }

  return (
    <aside className="sidebar">
      <Link href="/" className="logo">
        <span className="logo-mark">
          <Icon name="headset" />
        </span>
        <span>HelpDeskFlow</span>
      </Link>

      {org && (
        <div className="sidebar-org">
          <span className="org-mark">{org.name.slice(0, 1).toUpperCase()}</span>
          <div style={{ minWidth: 0 }}>
            <div className="org-label">Workspace</div>
            <div className="org-name">{org.name}</div>
            <div className="org-role">{org.role.replace("_", " ").toLowerCase()}</div>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {items.map((item) =>
          item.disabled ? (
            <span key={item.label} className="nav-item disabled" title="Coming soon">
              <Icon name={item.icon} />
              <span className="label">{item.label}</span>
              <span className="soon">soon</span>
            </span>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className={`nav-item${isActive(item) ? " active" : ""}`}
            >
              <Icon name={item.icon} />
              <span className="label">{item.label}</span>
            </Link>
          ),
        )}
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
