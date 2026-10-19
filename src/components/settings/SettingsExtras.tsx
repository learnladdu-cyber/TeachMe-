import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { listStaff } from "@/lib/orgs";
import { listInvites } from "@/lib/invites";
import { listTeams } from "@/lib/teams";
import { listCannedResponses } from "@/lib/canned";
import { listSlaPolicies } from "@/lib/sla";
import { listDeliveries, listEndpoints } from "@/lib/webhooks/store";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/dispatch";
import {
  addTeamMemberAction,
  beginTwoFactorAction,
  createCannedAction,
  createSlaAction,
  createTeamAction,
  createWebhookAction,
  deleteCannedAction,
  deleteSlaAction,
  deleteTeamAction,
  deleteWebhookAction,
  disableTwoFactorAction,
  enableTwoFactorAction,
  eraseUserAction,
  inviteMemberAction,
  removeTeamMemberAction,
  revokeInviteAction,
  setDefaultSlaAction,
  toggleWebhookAction,
} from "@/app/(workspace)/app/settings/actions";

const ROLE_OPTIONS = ["AGENT", "TEAM_LEAD", "ORG_ADMIN"] as const;

function roleLabel(role: string) {
  return role.toLowerCase().replace("_", " ");
}

export async function InvitesSection({ organizationId }: { organizationId: string }) {
  const invites = await listInvites(organizationId);
  const pending = invites.filter((i) => i.status === "PENDING");

  return (
    <div className="card">
      <h3 className="card-title">Invitations</h3>
      <form action={inviteMemberAction} className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div className="field grow">
          <label htmlFor="invite-email">Email</label>
          <input id="invite-email" name="email" type="email" required placeholder="teammate@company.com" />
        </div>
        <div className="field">
          <label htmlFor="invite-role">Role</label>
          <select id="invite-role" name="role" defaultValue="AGENT">
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button className="btn gold" type="submit">
            <Icon name="mail" /> Send invite
          </button>
        </div>
      </form>

      {pending.length > 0 && (
        <div className="mini-list" style={{ marginTop: 14 }}>
          {pending.map((invite) => (
            <div className="mini-row" key={invite.id}>
              <div>
                <div className="mini-title">{invite.email}</div>
                <div className="cell-sub">
                  {roleLabel(invite.role)} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                </div>
              </div>
              <form action={revokeInviteAction}>
                <input type="hidden" name="id" value={invite.id} />
                <button className="btn secondary sm" type="submit">
                  Revoke
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export async function TeamsSection({ organizationId }: { organizationId: string }) {
  const [teams, staff] = await Promise.all([listTeams(organizationId), listStaff(organizationId)]);

  return (
    <div className="card">
      <h3 className="card-title">Teams</h3>
      <form action={createTeamAction} className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div className="field grow">
          <label htmlFor="team-name">New team</label>
          <input id="team-name" name="name" required placeholder="Billing support" />
        </div>
        <div className="field grow">
          <label htmlFor="team-desc">Description</label>
          <input id="team-desc" name="description" placeholder="Optional" />
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button className="btn gold" type="submit">
            <Icon name="plus" /> Create
          </button>
        </div>
      </form>

      <div className="stack" style={{ gap: 14, marginTop: 16 }}>
        {teams.length === 0 && <p className="muted">No teams yet.</p>}
        {teams.map((team) => {
          const memberIds = new Set(team.members.map((m) => m.user.id));
          const available = staff.filter((s) => !memberIds.has(s.id));
          return (
            <div className="mini-row" key={team.id} style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div className="mini-title">
                  {team.name}{" "}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    · {team._count.tickets} tickets
                  </span>
                </div>
                <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {team.members.map((m) => (
                    <form action={removeTeamMemberAction} key={m.user.id}>
                      <input type="hidden" name="teamId" value={team.id} />
                      <input type="hidden" name="userId" value={m.user.id} />
                      <button className="badge no-dot status-CLOSED" type="submit" title="Remove from team">
                        {m.user.name} ✕
                      </button>
                    </form>
                  ))}
                </div>
                {available.length > 0 && (
                  <form action={addTeamMemberAction} className="row" style={{ gap: 8, marginTop: 8 }}>
                    <input type="hidden" name="teamId" value={team.id} />
                    <select name="userId" style={{ maxWidth: 220 }}>
                      {available.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button className="btn secondary sm" type="submit">
                      Add member
                    </button>
                  </form>
                )}
              </div>
              <form action={deleteTeamAction}>
                <input type="hidden" name="teamId" value={team.id} />
                <button className="btn danger sm" type="submit">
                  <Icon name="trash" size={15} />
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export async function CannedSection({ organizationId }: { organizationId: string }) {
  const canned = await listCannedResponses(organizationId);
  return (
    <div className="card">
      <h3 className="card-title">Canned responses</h3>
      <form action={createCannedAction} className="stack" style={{ gap: 10 }}>
        <div className="field">
          <label htmlFor="canned-title">Title</label>
          <input id="canned-title" name="title" required placeholder="Refund policy" />
        </div>
        <div className="field">
          <label htmlFor="canned-body">Body</label>
          <textarea id="canned-body" name="body" rows={3} required placeholder="Use the canned response text…" />
        </div>
        <div>
          <button className="btn gold" type="submit">
            <Icon name="plus" /> Add response
          </button>
        </div>
      </form>

      <div className="mini-list" style={{ marginTop: 16 }}>
        {canned.length === 0 && <p className="muted">No canned responses yet.</p>}
        {canned.map((c) => (
          <div className="mini-row" key={c.id}>
            <div>
              <div className="mini-title">{c.title}</div>
              <div className="cell-sub">{c.body.slice(0, 90)}</div>
            </div>
            <form action={deleteCannedAction}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn danger sm" type="submit">
                <Icon name="trash" size={15} />
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function SlaSection({ organizationId }: { organizationId: string }) {
  const policies = await listSlaPolicies(organizationId);
  return (
    <div className="card">
      <h3 className="card-title">SLA policies</h3>
      <form action={createSlaAction} className="stack" style={{ gap: 10 }}>
        <div className="field">
          <label htmlFor="sla-name">Name</label>
          <input id="sla-name" name="name" required placeholder="Standard support" />
        </div>
        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="sla-fr">First response (minutes)</label>
            <input id="sla-fr" name="firstResponseMins" type="number" min={1} defaultValue={60} required />
          </div>
          <div className="field">
            <label htmlFor="sla-res">Resolution (minutes)</label>
            <input id="sla-res" name="resolutionMins" type="number" min={1} defaultValue={480} required />
          </div>
        </div>
        <label className="check-row">
          <input type="checkbox" name="bhEnabled" />
          <span>Count only business hours (UTC)</span>
        </label>
        <div className="grid cols-3">
          <div className="field">
            <label htmlFor="sla-start">Start hour</label>
            <input id="sla-start" name="bhStart" type="number" min={0} max={23} defaultValue={9} />
          </div>
          <div className="field">
            <label htmlFor="sla-end">End hour</label>
            <input id="sla-end" name="bhEnd" type="number" min={1} max={24} defaultValue={17} />
          </div>
          <div className="field">
            <label htmlFor="sla-days">Days (0=Sun)</label>
            <input id="sla-days" name="bhDays" defaultValue="1,2,3,4,5" />
          </div>
        </div>
        <div>
          <button className="btn gold" type="submit">
            <Icon name="plus" /> Add policy
          </button>
        </div>
      </form>

      <div className="mini-list" style={{ marginTop: 16 }}>
        {policies.length === 0 && <p className="muted">Using built-in defaults (1h / 8h).</p>}
        {policies.map((p) => (
          <div className="mini-row" key={p.id}>
            <div>
              <div className="mini-title">
                {p.name} {p.isDefault && <span className="badge no-dot gold">default</span>}
              </div>
              <div className="cell-sub">
                First response {p.firstResponseMins}m · resolution {p.resolutionMins}m
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {!p.isDefault && (
                <form action={setDefaultSlaAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn secondary sm" type="submit">
                    Make default
                  </button>
                </form>
              )}
              <form action={deleteSlaAction}>
                <input type="hidden" name="id" value={p.id} />
                <button className="btn danger sm" type="submit">
                  <Icon name="trash" size={15} />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function WebhooksSection({ organizationId }: { organizationId: string }) {
  const [endpoints, deliveries] = await Promise.all([
    listEndpoints(organizationId),
    listDeliveries(organizationId, 8),
  ]);
  return (
    <div className="card">
      <h3 className="card-title">Outbound webhooks</h3>
      <form action={createWebhookAction} className="stack" style={{ gap: 10 }}>
        <div className="field">
          <label htmlFor="wh-url">Endpoint URL</label>
          <input id="wh-url" name="url" type="url" required placeholder="https://example.com/hooks/hdf" />
        </div>
        <div className="field">
          <label htmlFor="wh-secret">Signing secret (optional)</label>
          <input id="wh-secret" name="secret" placeholder="Used to sign payloads (x-hdf-signature)" />
        </div>
        <div className="field">
          <label htmlFor="wh-events">Events (comma separated, empty = all)</label>
          <input id="wh-events" name="events" defaultValue="ticket.created,ticket.resolved" />
          <div className="hint">{WEBHOOK_EVENTS.join(", ")}</div>
        </div>
        <div>
          <button className="btn gold" type="submit">
            <Icon name="plus" /> Add endpoint
          </button>
        </div>
      </form>

      <div className="mini-list" style={{ marginTop: 16 }}>
        {endpoints.length === 0 && <p className="muted">No webhook endpoints yet.</p>}
        {endpoints.map((e) => (
          <div className="mini-row" key={e.id}>
            <div style={{ minWidth: 0 }}>
              <div className="mini-title" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.url}
              </div>
              <div className="cell-sub">
                {e.events.length ? e.events.join(", ") : "all events"} · {e._count.deliveries} deliveries
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <form action={toggleWebhookAction}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="enabled" value={e.enabled ? "false" : "true"} />
                <button className="btn secondary sm" type="submit">
                  {e.enabled ? "Disable" : "Enable"}
                </button>
              </form>
              <form action={deleteWebhookAction}>
                <input type="hidden" name="id" value={e.id} />
                <button className="btn danger sm" type="submit">
                  <Icon name="trash" size={15} />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {deliveries.length > 0 && (
        <>
          <div className="divider" />
          <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>Recent deliveries</h4>
          <div className="mini-list">
            {deliveries.map((d) => (
              <div className="mini-row" key={d.id}>
                <div>
                  <div className="mini-title">{d.event}</div>
                  <div className="cell-sub">
                    {new Date(d.createdAt).toLocaleString()}
                    {d.responseCode ? ` · HTTP ${d.responseCode}` : ""}
                    {d.error ? ` · ${d.error}` : ""}
                  </div>
                </div>
                <span className={`badge ${d.status === "SUCCESS" ? "status-RESOLVED" : d.status === "FAILED" ? "status-URGENT" : "status-PENDING"}`}>
                  {d.status.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export async function SecuritySection({ userId }: { userId: string }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabledAt: true },
  });
  const store = await cookies();
  const backupCookie = store.get("hdf_mfa_backup")?.value;
  let backupCodes: string[] = [];
  if (backupCookie) {
    try {
      backupCodes = JSON.parse(backupCookie) as string[];
    } catch {
      backupCodes = [];
    }
  }

  return (
    <div className="card">
      <h3 className="card-title">Security</h3>
      {user?.totpEnabledAt ? (
        <>
          <p className="muted" style={{ fontSize: 13 }}>
            Two-factor authentication is <strong>enabled</strong> on your account.
          </p>
          <form action={disableTwoFactorAction}>
            <button className="btn secondary" type="submit">
              Disable two-factor
            </button>
          </form>
        </>
      ) : user?.totpSecret ? (
        <>
          <p className="muted" style={{ fontSize: 13 }}>
            Enter the 6-digit code from your authenticator app to finish enabling 2FA.
          </p>
          <p className="code" style={{ wordBreak: "break-all", fontSize: 12.5 }}>
            {user.totpSecret}
          </p>
          <form action={enableTwoFactorAction} className="row" style={{ gap: 10 }}>
            <input name="code" inputMode="numeric" placeholder="123456" required style={{ maxWidth: 160 }} />
            <button className="btn gold" type="submit">
              Confirm
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 13 }}>
            Add a second factor to protect the workspace.
          </p>
          <form action={beginTwoFactorAction}>
            <button className="btn gold" type="submit">
              <Icon name="lock" /> Set up 2FA
            </button>
          </form>
        </>
      )}

      {backupCodes.length > 0 && (
        <>
          <div className="divider" />
          <h4 style={{ margin: "0 0 6px", fontSize: 13.5 }}>Your backup codes</h4>
          <p className="muted" style={{ fontSize: 12.5 }}>
            Save these now — they won&apos;t be shown again.
          </p>
          <div className="code" style={{ fontSize: 12.5, lineHeight: 1.9 }}>
            {backupCodes.join("  ·  ")}
          </div>
        </>
      )}
    </div>
  );
}

export async function DataSection({
  organizationId,
  members,
  currentUserId,
}: {
  organizationId: string;
  members: { userId: string; name: string; email: string }[];
  currentUserId: string;
}) {
  const erasable = members.filter((m) => m.userId !== currentUserId);
  return (
    <div className="card">
      <h3 className="card-title">Data &amp; privacy</h3>
      <p className="muted" style={{ fontSize: 13 }}>
        Export your workspace data, or erase a customer&apos;s personal data on request.
      </p>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <a className="btn secondary" href={`/api/organizations/${organizationId}/export`} download>
          <Icon name="document" /> Export workspace data
        </a>
      </div>
      {erasable.length > 0 && (
        <form action={eraseUserAction} className="row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <select name="userId" style={{ maxWidth: 260 }}>
            {erasable.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
          <button className="btn danger" type="submit">
            <Icon name="trash" /> Erase user data
          </button>
        </form>
      )}
    </div>
  );
}

export function MemberAvatar({ name }: { name: string }) {
  return <Avatar name={name} />;
}
