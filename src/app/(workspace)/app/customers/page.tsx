import Link from "next/link";
import type { Role } from "@prisma/client";
import { requireStaff } from "@/lib/guard";
import { listMembers } from "@/lib/members";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { RoleBadge, MemberStatusBadge } from "@/components/Badges";
import { ArtEmpty } from "@/components/illustrations";

export const dynamic = "force-dynamic";

function when(value: Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Group = "all" | "customers" | "staff";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const group: Group =
    sp.group === "customers" || sp.group === "staff" ? (sp.group as Group) : "all";

  const members = await listMembers(ctx.organizationId, { q });
  const filtered = members.filter((m) =>
    group === "customers" ? !m.isStaff : group === "staff" ? m.isStaff : true,
  );

  const customerCount = members.filter((m) => !m.isStaff).length;
  const staffCount = members.filter((m) => m.isStaff).length;
  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const withTickets = members.filter((m) => m.requested > 0).length;

  const tabs: { key: Group; label: string; count: number }[] = [
    { key: "all", label: "All people", count: members.length },
    { key: "customers", label: "Customers", count: customerCount },
    { key: "staff", label: "Staff", count: staffCount },
  ];

  const tabHref = (g: Group) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("group", g);
    return `/app/customers?${p.toString()}`;
  };

  const kpis = [
    { label: "Total people", value: members.length, icon: "users" as const, tone: "" },
    { label: "Customers", value: customerCount, icon: "user" as const, tone: "gold" },
    { label: "Staff", value: staffCount, icon: "headset" as const, tone: "" },
    { label: "Active", value: activeCount, icon: "check" as const, tone: "green" },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p className="page-sub">
            Directory of everyone in this workspace · {withTickets} with ticket history
          </p>
        </div>
        <form className="row" action="/app/customers" method="get" style={{ gap: 8 }}>
          <input type="hidden" name="group" value={group} />
          <div style={{ position: "relative" }}>
            <span
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
            >
              <Icon name="search" size={16} />
            </span>
            <input
              name="q"
              placeholder="Search name or email"
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
        {kpis.map((k) => (
          <div className="stat-card" key={k.label}>
            <span className={`stat-icon ${k.tone}`}>
              <Icon name={k.icon} />
            </span>
            <div>
              <div className="stat-label">{k.label}</div>
              <div className="stat-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="segmented">
          {tabs.map((t) => (
            <Link key={t.key} href={tabHref(t.key)} className={group === t.key ? "on" : ""}>
              {t.label} <span className="muted">· {t.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <ArtEmpty />
          <h3>No people found</h3>
          <p>Try a different search term or switch group.</p>
          <Link href="/app/customers" className="btn secondary">
            Reset filters
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Assigned</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.membershipId}>
                  <td>
                    <div className="cell-user">
                      <Avatar name={m.name} />
                      <div>
                        <strong style={{ fontSize: 13.5 }}>{m.name}</strong>
                        <div className="cell-sub">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <RoleBadge role={m.role as Role} />
                  </td>
                  <td>
                    <MemberStatusBadge status={m.status} />
                  </td>
                  <td>{m.requested}</td>
                  <td>{m.isStaff ? m.assigned : "—"}</td>
                  <td className="muted">
                    {when(m.lastActivity ?? m.joinedAt)}
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
