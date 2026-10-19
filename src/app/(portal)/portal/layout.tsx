import { redirect } from "next/navigation";
import { getActiveContext } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import type { SidebarItem } from "@/components/AppSidebar";

const items: SidebarItem[] = [
  { href: "/portal", label: "My support", icon: "inbox", exact: true },
  { href: "/portal/tickets/new", label: "New ticket", icon: "plus" },
  { href: "/features", label: "Help center", icon: "book" },
  { href: "/portal/profile", label: "Profile", icon: "user" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getActiveContext();
  if (!ctx) {
    const session = await getSession();
    redirect(session?.user.isPlatformAdmin ? "/admin" : "/login");
  }

  const org = ctx.session.memberships.find((m) => m.organizationId === ctx.organizationId)
    ?.organization;

  return (
    <AppShell
      items={items}
      user={{ name: ctx.session.user.name, email: ctx.session.user.email }}
      org={org ? { name: org.name, role: ctx.role } : null}
    >
      {children}
    </AppShell>
  );
}
