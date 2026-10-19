import { requirePlatformAdmin } from "@/lib/admin";
import { AdminSidebar, type AdminNavItem } from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

const items: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard", exact: true },
  { href: "/admin/organizations", label: "Organizations", icon: "building" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/integrations", label: "Integrations", icon: "settings" },
  { href: "/admin/plans", label: "Plans", icon: "tag" },
  { href: "/admin/audit", label: "Audit log", icon: "document" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin();

  return (
    <div className="shell">
      <AdminSidebar
        items={items}
        user={{ name: session.user.name, email: session.user.email }}
      />
      <div className="shell-main">
        <div className="shell-content">{children}</div>
      </div>
    </div>
  );
}
