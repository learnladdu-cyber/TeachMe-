import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/guard";
import { isStaff } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { AutoSubmit } from "@/components/AutoSubmit";
import { RoleBadge } from "@/components/Badges";
import { updateMemberRoleAction, updateMemberStatusAction, updateOrgAction } from "./actions";
import {
  CannedSection,
  DataSection,
  InvitesSection,
  SecuritySection,
  SlaSection,
  TeamsSection,
  WebhooksSection,
} from "@/components/settings/SettingsExtras";

export const dynamic = "force-dynamic";

const ROLES = ["CUSTOMER", "AGENT", "TEAM_LEAD", "ORG_ADMIN"] as const;
const STATUSES = ["ACTIVE", "INVITED", "SUSPENDED"] as const;
const TIMEZONES = ["UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney"];
const LOCALES = [
  { key: "en", label: "English" },
  { key: "hi", label: "हिन्दी" },
  { key: "es", label: "Español" },
  { key: "fr", label: "Français" },
  { key: "de", label: "Deutsch" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const ctx = await requireStaff("ORG_ADMIN");
  const sp = await searchParams;

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    include: {
      plan: true,
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ role: "asc" }, { joinedAt: "desc" }],
      },
    },
  });
  if (!org) notFound();

  const isPlatform = ctx.role === "PLATFORM_ADMIN" || ctx.session.user.isPlatformAdmin;
  const displayRole = ctx.session.user.isPlatformAdmin ? "PLATFORM_ADMIN" : ctx.role;
  const planFeatures = Array.isArray(org.plan?.features)
    ? (org.plan?.features as unknown as string[])
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="page-sub">
            Workspace profile, plan and member access · you are{" "}
            {displayRole.replace("_", " ").toLowerCase()}
          </p>
        </div>
      </div>

      {sp.saved && (
        <div className="alert success">
          <Icon name="check" />
          <span>Changes saved.</span>
        </div>
      )}
      {sp.error === "name" && (
        <div className="alert error">
          <Icon name="alert" />
          <span>Organization name is required.</span>
        </div>
      )}
      {sp.error === "self" && (
        <div className="alert error">
          <Icon name="alert" />
          <span>You cannot change your own membership.</span>
        </div>
      )}
      {sp.error === "member" && (
        <div className="alert error">
          <Icon name="alert" />
          <span>That member could not be updated.</span>
        </div>
      )}
      {sp.error === "chat" && (
        <div className="alert error">
          <Icon name="alert" />
          <span>Could not save the chat widget settings. Check the accent colour.</span>
        </div>
      )}
      {sp.error && !["name", "self", "member", "chat"].includes(sp.error) && (
        <div className="alert error">
          <Icon name="alert" />
          <span>Something went wrong. Please check the values and try again.</span>
        </div>
      )}
      {sp.saved && ["invite", "team", "canned", "sla", "webhook", "2fa", "erased"].includes(sp.saved) && (
        <div className="alert success">
          <Icon name="check" />
          <span>Saved.</span>
        </div>
      )}

      <div className="split">
        <div className="stack" style={{ gap: 18 }}>
          <form action={updateOrgAction} className="card">
            <h3 className="card-title">Organization profile</h3>
            <div className="stack" style={{ gap: 16 }}>
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" defaultValue={org.name} required />
                <div className="hint">
                  Slug <span className="code">{org.slug}</span> is used in URLs and cannot change here.
                </div>
              </div>
              <div className="grid cols-2">
                <div className="field">
                  <label htmlFor="timezone">Timezone</label>
                  <select id="timezone" name="timezone" defaultValue={org.timezone}>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="locale">Default locale</label>
                  <select id="locale" name="locale" defaultValue={org.locale}>
                    {LOCALES.map((l) => (
                      <option key={l.key} value={l.key}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <button className="btn gold" type="submit">
                  <Icon name="check" /> Save organization
                </button>
              </div>
            </div>
          </form>

          <div className="card flush">
            <div style={{ padding: "18px 20px 4px" }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                Members &amp; access
              </h3>
            </div>
            <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {org.members.map((m) => {
                    const self = m.userId === ctx.session.user.id;
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="cell-user">
                            <Avatar name={m.user.name} />
                            <div>
                              <strong style={{ fontSize: 13.5 }}>{m.user.name}</strong>
                              <div className="cell-sub">{m.user.email}</div>
                            </div>
                            {self && <span className="badge no-dot gold">you</span>}
                          </div>
                        </td>
                        <td>
                          {self ? (
                            <RoleBadge role={m.role} />
                          ) : (
                            <AutoSubmit action={updateMemberRoleAction}>
                              <input type="hidden" name="membershipId" value={m.id} />
                              <select name="role" defaultValue={m.role} style={{ minWidth: 140 }}>
                                {ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r.replace("_", " ").toLowerCase()}
                                  </option>
                                ))}
                              </select>
                            </AutoSubmit>
                          )}
                        </td>
                        <td>
                          {self ? (
                            <span className="badge status-RESOLVED">{m.status.toLowerCase()}</span>
                          ) : (
                            <AutoSubmit action={updateMemberStatusAction}>
                              <input type="hidden" name="membershipId" value={m.id} />
                              <select name="status" defaultValue={m.status} style={{ minWidth: 130 }}>
                                {STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s.toLowerCase()}
                                  </option>
                                ))}
                              </select>
                            </AutoSubmit>
                          )}
                        </td>
                        <td className="muted">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <InvitesSection organizationId={ctx.organizationId} />
          <TeamsSection organizationId={ctx.organizationId} />
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <h3 className="card-title">Plan</h3>
            <div className="meta-list">
              <div className="meta-item">
                <span className="k">Plan</span>
                <span className="v">{org.plan?.name ?? "No plan"}</span>
              </div>
              <div className="meta-item">
                <span className="k">Agent limit</span>
                <span className="v">{org.plan?.agentLimit ?? "Unlimited"}</span>
              </div>
              <div className="meta-item">
                <span className="k">Monthly tickets</span>
                <span className="v">{org.plan?.monthlyTickets ?? "Unlimited"}</span>
              </div>
              <div className="meta-item">
                <span className="k">Retention</span>
                <span className="v">
                  {org.plan?.retentionDays ? `${org.plan.retentionDays} days` : "—"}
                </span>
              </div>
            </div>
            {planFeatures.length > 0 && (
              <>
                <div className="divider" />
                <ul className="plan-list">
                  {planFeatures.map((f) => (
                    <li key={f}>
                      <span className="tick">
                        <Icon name="check" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Chat widget</h3>
              <Link className="btn ghost sm" href="/app/widget">
                <Icon name="chat" /> Manage
              </Link>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              Add the docs-grounded support assistant to your website, customise its look and copy
              the install snippet from the dedicated Chat widget page.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title">Workspace</h3>
            <div className="meta-list">
              <div className="meta-item">
                <span className="k">Status</span>
                <span className="v">{org.status.toLowerCase()}</span>
              </div>
              <div className="meta-item">
                <span className="k">Members</span>
                <span className="v">{org.members.length}</span>
              </div>
              <div className="meta-item">
                <span className="k">Staff</span>
                <span className="v">{org.members.filter((m) => isStaff(m.role)).length}</span>
              </div>
              <div className="meta-item">
                <span className="k">Created</span>
                <span className="v">{new Date(org.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            {isPlatform && (
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
                Platform admin access is privileged and audited.
              </p>
            )}
          </div>

          <SecuritySection userId={ctx.session.user.id} />
          <CannedSection organizationId={ctx.organizationId} />
          <SlaSection organizationId={ctx.organizationId} />
          <WebhooksSection organizationId={ctx.organizationId} />
          <DataSection
            organizationId={ctx.organizationId}
            currentUserId={ctx.session.user.id}
            members={org.members.map((m) => ({
              userId: m.userId,
              name: m.user.name,
              email: m.user.email,
            }))}
          />
        </div>
      </div>
    </>
  );
}
