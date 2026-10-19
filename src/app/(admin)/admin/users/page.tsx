import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { setPlatformAdminAction, unlockUserAction } from "../actions";

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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ok?: string; error?: string }>;
}) {
  const session = await requirePlatformAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { memberships: true } } },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="page-sub">Everyone on the platform. Managing access is audited.</p>
        </div>
        <form className="row" action="/admin/users" method="get" style={{ gap: 8 }}>
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

      {sp.ok === "role" && (
        <div className="alert success">
          <Icon name="check" />
          <span>Platform role updated.</span>
        </div>
      )}
      {sp.ok === "unlock" && (
        <div className="alert success">
          <Icon name="check" />
          <span>Account unlocked.</span>
        </div>
      )}
      {sp.error === "self" && (
        <div className="alert error">
          <Icon name="alert" />
          <span>You cannot change your own platform role.</span>
        </div>
      )}

      {users.length === 0 ? (
        <div className="empty">
          <h3>No users found</h3>
          <p>Try a different search.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Organizations</th>
                <th>Role</th>
                <th>Last sign-in</th>
                <th>Account</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === session.user.id;
                const locked = u.lockedUntil ? new Date(u.lockedUntil) > new Date() : false;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="cell-user">
                        <Avatar name={u.name} />
                        <div>
                          <strong style={{ fontSize: 13.5 }}>{u.name}</strong>
                          {isSelf && <span className="cell-sub"> (you)</span>}
                          <div className="cell-sub code">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u._count.memberships}</td>
                    <td>
                      {u.isPlatformAdmin ? (
                        <span className="badge no-dot role-platform">platform admin</span>
                      ) : (
                        <span className="muted">member</span>
                      )}
                    </td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {when(u.lastLoginAt)}
                    </td>
                    <td>
                      {locked ? (
                        <span className="badge prio-URGENT">locked</span>
                      ) : (
                        <span className="muted">ok</span>
                      )}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                        {locked && (
                          <form action={unlockUserAction}>
                            <input type="hidden" name="userId" value={u.id} />
                            <button className="btn secondary sm" type="submit">
                              Unlock
                            </button>
                          </form>
                        )}
                        {!isSelf && (
                          <form action={setPlatformAdminAction}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="value" value={u.isPlatformAdmin ? "0" : "1"} />
                            <button
                              className={u.isPlatformAdmin ? "btn secondary sm" : "btn sm"}
                              type="submit"
                            >
                              {u.isPlatformAdmin ? "Revoke admin" : "Make admin"}
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
        Showing up to 100 users.{" "}
        <Link href="/admin/organizations">Browse by organization</Link>{" "}
        for tenant-scoped views.
      </p>
    </>
  );
}
