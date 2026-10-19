import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin";
import { isBehind, LATEST_VERSION } from "@/lib/releases";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { AutoSubmit } from "@/components/AutoSubmit";
import { PriorityBadge, StatusBadge, RoleBadge, MemberStatusBadge } from "@/components/Badges";
import { updateOrgStatusAction, updateOrgPlanAction, renameOrgAction } from "../../actions";

export const dynamic = "force-dynamic";

function when(value: Date | string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminOrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requirePlatformAdmin();

  const { id } = await params;
  const sp = await searchParams;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      plan: { select: { id: true, name: true } },
      members: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
      },
      _count: { select: { tickets: true, chatConversations: true, articles: true, automations: true } },
    },
  });
  if (!org) notFound();

  const [plans, tickets, audit] = await Promise.all([
    prisma.plan.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.ticket.findMany({
      where: { organizationId: org.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { requester: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  const next = `/admin/organizations/${org.id}`;
  const targetStatus = org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  return (
    <>
      <div className="page-head">
        <div>
          <p className="page-sub" style={{ marginBottom: 4 }}>
            <Link href="/admin/organizations">← Organizations</Link>
          </p>
          <h1>{org.name}</h1>
          <p className="page-sub">
            <span className="code">{org.slug}</span> · created {when(org.createdAt)} ·{" "}
            <span className={`badge ${org.status === "ACTIVE" ? "status-RESOLVED" : "prio-URGENT"}`}>
              {org.status.toLowerCase()}
            </span>
          </p>
        </div>
        <form action={updateOrgStatusAction}>
          <input type="hidden" name="organizationId" value={org.id} />
          <input type="hidden" name="status" value={targetStatus} />
          <input type="hidden" name="next" value={next} />
          <button className={targetStatus === "SUSPENDED" ? "btn danger" : "btn gold"} type="submit">
            <Icon name={targetStatus === "SUSPENDED" ? "lock" : "check"} size={16} />
            {targetStatus === "SUSPENDED" ? "Suspend tenant" : "Reactivate tenant"}
          </button>
        </form>
      </div>

      {sp.ok && (
        <div className="alert success">
          <Icon name="check" />
          <span>Change saved and written to the audit log.</span>
        </div>
      )}
      {sp.error && (
        <div className="alert error">
          <Icon name="alert" />
          <span>That change could not be applied.</span>
        </div>
      )}

      <div className="kpis" style={{ marginBottom: 22 }}>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="users" />
          </span>
          <div>
            <div className="stat-label">Members</div>
            <div className="stat-value">{org.members.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon amber">
            <Icon name="ticket" />
          </span>
          <div>
            <div className="stat-label">Tickets</div>
            <div className="stat-value">{org._count.tickets}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <Icon name="chat" />
          </span>
          <div>
            <div className="stat-label">Chats</div>
            <div className="stat-value">{org._count.chatConversations}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="book" />
          </span>
          <div>
            <div className="stat-label">Articles</div>
            <div className="stat-value">{org._count.articles}</div>
          </div>
        </div>
      </div>

      <div className="grid cols-2" style={{ gap: 22, alignItems: "start" }}>
        <section className="card">
          <h2 className="card-title">Profile</h2>
          <form action={renameOrgAction} className="stack" style={{ gap: 12 }}>
            <input type="hidden" name="organizationId" value={org.id} />
            <input type="hidden" name="next" value={next} />
            <div className="field">
              <label htmlFor="org-name">Name</label>
              <input id="org-name" name="name" defaultValue={org.name} maxLength={160} required />
            </div>
            <button className="btn secondary" type="submit">
              Save name
            </button>
          </form>

          <div className="divider" />

          <div className="stack" style={{ gap: 10 }}>
            <div className="row between">
              <span className="muted">Plan</span>
              <AutoSubmit action={updateOrgPlanAction} className="inline-form">
                <input type="hidden" name="organizationId" value={org.id} />
                <input type="hidden" name="next" value={next} />
                <select name="planId" defaultValue={org.plan?.id ?? ""}>
                  <option value="">No plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </AutoSubmit>
            </div>
            <div className="row between">
              <span className="muted">Timezone</span>
              <span className="code">{org.timezone}</span>
            </div>
            <div className="row between">
              <span className="muted">Locale</span>
              <span className="code">{org.locale}</span>
            </div>
            <div className="row between">
              <span className="muted">Version</span>
              <span>
                v{org.appVersion}
                {isBehind(org.appVersion) ? ` → v${LATEST_VERSION} available` : " · latest"}
              </span>
            </div>
            <div className="row between">
              <span className="muted">Chat widget</span>
              <span>
                {org.chatEnabled ? "enabled" : "disabled"}
                {org.chatKey ? ` · ${org.chatKey}` : ""}
                {` · engine v${org.chatWidgetVersion}`}
              </span>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Members ({org.members.length})</h2>
          {org.members.length === 0 ? (
            <p className="muted">No members.</p>
          ) : (
            <div className="mini-list">
              {org.members.map((m) => (
                <div key={m.id} className="mini-row">
                  <Avatar name={m.user.name} />
                  <div style={{ minWidth: 0 }}>
                    <div className="mini-title">{m.user.name}</div>
                    <div className="cell-sub code">{m.user.email}</div>
                  </div>
                  <RoleBadge role={m.role} />
                  <MemberStatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid cols-2" style={{ gap: 22, marginTop: 22, alignItems: "start" }}>
        <section className="card">
          <h2 className="card-title">Recent tickets</h2>
          {tickets.length === 0 ? (
            <p className="muted">No tickets.</p>
          ) : (
            <div className="mini-list">
              {tickets.map((t) => (
                <div key={t.id} className="mini-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="mini-title">{t.subject}</div>
                    <div className="cell-sub">
                      {t.publicId} · {t.requester.name} · {when(t.updatedAt)}
                    </div>
                  </div>
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Audit trail</h2>
          {audit.length === 0 ? (
            <p className="muted">No recorded activity.</p>
          ) : (
            <div className="mini-list">
              {audit.map((a) => (
                <div key={a.id} className="mini-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="mini-title code">{a.action}</div>
                    <div className="cell-sub">
                      {a.actor?.email ?? "system"}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </div>
                  </div>
                  <span className="cell-sub" style={{ whiteSpace: "nowrap" }}>
                    {when(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
