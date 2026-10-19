import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, listSessions } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { RoleBadge } from "@/components/Badges";
import { PASSWORD_MIN_LENGTH } from "@/lib/security/password-policy";
import {
  changePasswordAction,
  revokeSessionAction,
  signOutEverywhereAction,
  updateProfileAction,
} from "./actions";

export const dynamic = "force-dynamic";

const LOCALES = [
  { key: "en", label: "English" },
  { key: "hi", label: "हिन्दी" },
  { key: "es", label: "Español" },
  { key: "fr", label: "Français" },
  { key: "de", label: "Deutsch" },
];

const ERROR_MESSAGES: Record<string, string> = {
  name: "Name is required.",
  policy: `Password must be at least ${PASSWORD_MIN_LENGTH} characters, mix letter case, numbers and symbols, and avoid common or personal values.`,
  throttled: "Too many password attempts. Please wait a few minutes and try again.",
  mismatch: "New passwords do not match.",
  current: "Current password is incorrect.",
};

const SAVED_MESSAGES: Record<string, string> = {
  pw: "Password updated. Other sessions have been signed out.",
  session: "Session revoked.",
  "1": "Profile saved.",
};

function describeAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();
  const browser =
    ua.includes("edg/") ? "Edge"
    : ua.includes("chrome/") ? "Chrome"
    : ua.includes("safari/") ? "Safari"
    : ua.includes("firefox/") ? "Firefox"
    : ua.includes("curl") ? "Command line"
    : "Browser";
  const os =
    ua.includes("windows") ? "Windows"
    : ua.includes("mac os") ? "macOS"
    : ua.includes("android") ? "Android"
    : ua.includes("iphone") || ua.includes("ipad") ? "iOS"
    : ua.includes("linux") ? "Linux"
    : "Unknown OS";
  return `${browser} on ${os}`;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: { include: { organization: { select: { id: true, name: true } } } },
      _count: { select: { sessions: true, requested: true } },
    },
  });
  if (!user) redirect("/login");

  const sessions = await listSessions(session.user.id, session.sessionId);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Profile</h1>
          <p className="page-sub">Manage your personal details, password and preferences.</p>
        </div>
        <div className="row">
          <Avatar name={user.name} />
          <div>
            <strong style={{ fontSize: 14 }}>{user.name}</strong>
            <div className="cell-sub">{user.email}</div>
          </div>
        </div>
      </div>

      {sp.saved && SAVED_MESSAGES[sp.saved] && (
        <div className="alert success">
          <Icon name="check" />
          <span>{SAVED_MESSAGES[sp.saved]}</span>
        </div>
      )}
      {sp.error && ERROR_MESSAGES[sp.error] && (
        <div className="alert error">
          <Icon name="alert" />
          <span>{ERROR_MESSAGES[sp.error]}</span>
        </div>
      )}

      <div className="split">
        <div className="stack" style={{ gap: 18 }}>
          <form action={updateProfileAction} className="card">
            <h3 className="card-title">Personal details</h3>
            <div className="stack" style={{ gap: 16 }}>
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input id="name" name="name" defaultValue={user.name} required />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" defaultValue={user.email} disabled />
                <div className="hint">Email is your sign-in identity and cannot be changed here.</div>
              </div>
              <div className="field">
                <label htmlFor="locale">Preferred language</label>
                <select id="locale" name="locale" defaultValue={user.locale}>
                  {LOCALES.map((l) => (
                    <option key={l.key} value={l.key}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button className="btn gold" type="submit">
                  <Icon name="check" /> Save profile
                </button>
              </div>
            </div>
          </form>

          <form action={changePasswordAction} className="card">
            <h3 className="card-title">Change password</h3>
            <div className="stack" style={{ gap: 16 }}>
              <div className="field">
                <label htmlFor="current">Current password</label>
                <input id="current" name="current" type="password" autoComplete="current-password" required />
              </div>
              <div className="grid cols-2">
                <div className="field">
                  <label htmlFor="next">New password</label>
                  <input id="next" name="next" type="password" autoComplete="new-password" required />
                  <div className="hint">
                    At least {PASSWORD_MIN_LENGTH} characters with mixed case, a number and a symbol.
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="confirm">Confirm new password</label>
                  <input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
                </div>
              </div>
              <div>
                <button className="btn" type="submit">
                  <Icon name="lock" /> Update password
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <h3 className="card-title">Account</h3>
            <div className="meta-list">
              <div className="meta-item">
                <span className="k">Email</span>
                <span className="v" style={{ fontSize: 13 }}>{user.email}</span>
              </div>
              <div className="meta-item">
                <span className="k">Platform admin</span>
                <span className="v">{user.isPlatformAdmin ? "Yes" : "No"}</span>
              </div>
              <div className="meta-item">
                <span className="k">Tickets requested</span>
                <span className="v">{user._count.requested}</span>
              </div>
              <div className="meta-item">
                <span className="k">Active sessions</span>
                <span className="v">{user._count.sessions}</span>
              </div>
              <div className="meta-item">
                <span className="k">Member since</span>
                <span className="v">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="row between" style={{ alignItems: "center", gap: 12 }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                Active sessions
              </h3>
              <form action={signOutEverywhereAction}>
                <button className="btn sm secondary" type="submit">
                  <Icon name="shield" /> Sign out everywhere
                </button>
              </form>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
              Signed in on {sessions.length} device{sessions.length === 1 ? "" : "s"}. Revoke any
              session you do not recognise.
            </p>
            <div className="stack" style={{ gap: 10 }}>
              {sessions.map((s) => (
                <div key={s.id} className="row between" style={{ gap: 10, flexWrap: "nowrap" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {describeAgent(s.userAgent)}{" "}
                      {s.current && <span className="badge no-dot">This device</span>}
                    </div>
                    <div className="cell-sub">
                      Started {new Date(s.createdAt).toLocaleDateString()} · last active{" "}
                      {new Date(s.lastSeenAt).toLocaleString()}
                    </div>
                  </div>
                  {!s.current && (
                    <form action={revokeSessionAction}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <button className="btn sm danger" type="submit">
                        <Icon name="trash" /> Revoke
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Workspaces</h3>
            {user.memberships.length === 0 ? (
              <p className="muted">No workspace memberships.</p>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                {user.memberships.map((m) => (
                  <div
                    key={m.id}
                    className="row between"
                    style={{ gap: 10, flexWrap: "nowrap" }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{m.organization.name}</span>
                    <RoleBadge role={m.role} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
