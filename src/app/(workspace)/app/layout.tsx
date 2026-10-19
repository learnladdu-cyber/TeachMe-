import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { roleAtLeast } from "@/lib/auth";
import { isBehind, LATEST_VERSION } from "@/lib/releases";
import { AppShell } from "@/components/AppShell";
import type { SidebarItem } from "@/components/AppSidebar";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const activeId = session.activeOrganizationId;
  const membership = activeId
    ? session.memberships.find((m) => m.organizationId === activeId)
    : undefined;
  const role = (membership?.role ??
    (session.user.isPlatformAdmin ? "PLATFORM_ADMIN" : null)) as Role | null;

  if (!role) redirect("/login");
  if (role === "CUSTOMER") redirect("/portal");

  const orgRow = membership
    ? await prisma.organization.findUnique({
        where: { id: membership.organizationId },
        select: { appVersion: true },
      })
    : null;
  const updateAvailable = orgRow && isBehind(orgRow.appVersion) ? LATEST_VERSION : null;

  const items: SidebarItem[] = [
    { href: "/app", label: "Inbox", icon: "inbox", exact: true },
    { href: "/app/chat", label: "Live chat", icon: "chat" },
    { href: "/app/customers", label: "Customers", icon: "users" },
    { href: "/app/knowledge", label: "Knowledge base", icon: "book" },
    { href: "/app/automation", label: "Automation", icon: "bolt" },
    { href: "/app/reports", label: "Reports", icon: "chart" },
    { href: "/app/notifications", label: "Notifications", icon: "bell" },
    { href: "/app/updates", label: "Updates", icon: "sparkles" },
  ];
  if (roleAtLeast(role, "ORG_ADMIN")) {
    items.push({ href: "/app/widget", label: "Chat widget", icon: "chat" });
    items.push({ href: "/app/billing", label: "Billing", icon: "ticket" });
    items.push({ href: "/app/settings", label: "Settings", icon: "settings" });
  }

  return (
    <AppShell
      items={items}
      user={{ name: session.user.name, email: session.user.email }}
      updateAvailable={updateAvailable}
      org={
        membership
          ? { name: membership.organization.name, role }
          : { name: "Platform", role: "platform admin" }
      }
    >
      {children}
    </AppShell>
  );
}
