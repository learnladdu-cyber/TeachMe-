import Link from "next/link";
import type { OrgStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin";
import { isBehind, LATEST_VERSION } from "@/lib/releases";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

function when(value: Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requirePlatformAdmin();

  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const status: OrgStatus | undefined =
    sp.status === "ACTIVE" || sp.status === "SUSPENDED" ? sp.status : undefined;

  const where: Prisma.OrganizationWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [organizations, total, active, suspended] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { name: true } },
        _count: { select: { members: true, tickets: true, chatConversations: true } },
      },
    }),
    prisma.organization.count(),
    prisma.organization.count({ where: { status: "ACTIVE" } }),
    prisma.organization.count({ where: { status: "SUSPENDED" } }),
  ]);

  const filters: { label: string; value?: string; count: number }[] = [
    { label: "All", value: undefined, count: total },
    { label: "Active", value: "ACTIVE", count: active },
    { label: "Suspended", value: "SUSPENDED", count: suspended },
  ];

  const filterHref = (value?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (value) params.set("status", value);
    const qs = params.toString();
    return `/admin/organizations${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Organizations</h1>
          <p className="page-sub">Every tenant on the platform, with usage and plan.</p>
        </div>
        <form className="row" action="/admin/organizations" method="get" style={{ gap: 8 }}>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            >
              <Icon name="search" size={16} />
            </span>
            <input
              name="q"
              placeholder="Search name or slug"
              defaultValue={q ?? ""}
              style={{ width: 240, paddingLeft: 36 }}
            />
          </div>
          <button className="btn secondary" type="submit">
            Search
          </button>
        </form>
      </div>

      <div className="filters">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={filterHref(f.value)}
            className={`chip${status === f.value || (!status && !f.value) ? " active" : ""}`}
          >
            {f.label}
            <span className="count">{f.count}</span>
          </Link>
        ))}
      </div>

      {organizations.length === 0 ? (
        <div className="empty">
          <h3>No organizations found</h3>
          <p>Try a different search or filter.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Version</th>
                <th>Members</th>
                <th>Tickets</th>
                <th>Chats</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/organizations/${o.id}`} className="ticket-link">
                      <span className="cell-user">
                        <Avatar name={o.name} />
                        <span>
                          <strong style={{ fontSize: 13.5 }}>{o.name}</strong>
                          <span className="cell-sub code" style={{ display: "block" }}>
                            {o.slug}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="muted">{o.plan?.name ?? "—"}</td>
                  <td>
                    <span
                      className={`badge ${o.status === "ACTIVE" ? "status-RESOLVED" : "prio-URGENT"}`}
                    >
                      {o.status.toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${isBehind(o.appVersion) ? "warn" : "ok"}`}>
                      v{o.appVersion}
                      {isBehind(o.appVersion) ? ` → v${LATEST_VERSION}` : ""}
                    </span>
                  </td>
                  <td>{o._count.members}</td>
                  <td>{o._count.tickets}</td>
                  <td>{o._count.chatConversations}</td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>
                    {when(o.createdAt)}
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
