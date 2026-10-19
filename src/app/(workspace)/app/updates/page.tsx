import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/guard";
import { roleAtLeast } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import {
  LATEST_VERSION,
  LATEST_WIDGET_VERSION,
  RELEASES,
  isBehind,
  pendingReleases,
} from "@/lib/releases";
import { updateWorkspaceAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { appVersion: true, chatWidgetVersion: true },
  });

  const appVersion = org?.appVersion ?? LATEST_VERSION;
  const widgetVersion = org?.chatWidgetVersion ?? LATEST_WIDGET_VERSION;
  const behind = isBehind(appVersion);
  const pending = pendingReleases(appVersion);
  const canUpdate = roleAtLeast(ctx.role, "ORG_ADMIN");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Updates</h1>
          <p className="page-sub">
            Keep this workspace on the latest release to get every new feature and fix.
          </p>
        </div>
        <span className={`pill ${behind ? "warn" : "ok"}`}>
          v{appVersion}
          {behind ? ` → v${LATEST_VERSION}` : " · latest"}
        </span>
      </div>

      {sp.updated && (
        <div className="alert success">
          <Icon name="check" />
          <span>Workspace updated to v{LATEST_VERSION}. You are on the latest release.</span>
        </div>
      )}

      {behind ? (
        <div className="card update-panel">
          <div className="update-panel-head">
            <span className="stat-icon gold">
              <Icon name="sparkles" />
            </span>
            <div>
              <h3 className="card-title" style={{ marginBottom: 2 }}>
                A newer version is available
              </h3>
              <p className="muted" style={{ margin: 0 }}>
                You are on v{appVersion}. Updating brings this workspace to v{LATEST_VERSION} — your
                data, settings and members are kept.
              </p>
            </div>
          </div>

          <div className="release-stack">
            {pending.map((release) => (
              <div className="release release--pending" key={release.version}>
                <div className="release-head">
                  <span className="release-version">v{release.version}</span>
                  <div>
                    <strong>{release.title}</strong>
                    <span className="release-date">{release.date}</span>
                  </div>
                  <span className="pill warn">New</span>
                </div>
                <ul className="release-notes">
                  {release.highlights.map((h) => (
                    <li key={h}>
                      <span className="tick">
                        <Icon name="check" />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {canUpdate ? (
            <form action={updateWorkspaceAction}>
              <button className="btn gold" type="submit">
                <Icon name="sparkles" /> Update workspace to v{LATEST_VERSION}
              </button>
            </form>
          ) : (
            <p className="muted" style={{ marginTop: 14 }}>
              Ask an organization admin to apply this update.
            </p>
          )}
        </div>
      ) : (
        <div className="card update-panel update-panel--current">
          <div className="update-panel-head">
            <span className="stat-icon green">
              <Icon name="check" />
            </span>
            <div>
              <h3 className="card-title" style={{ marginBottom: 2 }}>
                You&apos;re on the latest version
              </h3>
              <p className="muted" style={{ margin: 0 }}>
                Workspace v{appVersion} · chat widget engine v{widgetVersion}. New releases will
                appear here automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Release history</h3>
        <div className="release-stack">
          {RELEASES.map((release) => {
            const isCurrent = release.version === appVersion;
            const isNew = release.version > appVersion;
            return (
              <div
                className={`release${isCurrent ? " release--current" : ""}`}
                key={release.version}
              >
                <div className="release-head">
                  <span className={`release-version${isCurrent ? " is-current" : ""}`}>
                    v{release.version}
                  </span>
                  <div>
                    <strong>{release.title}</strong>
                    <span className="release-date">{release.date}</span>
                  </div>
                  {isCurrent && <span className="pill ok">Current</span>}
                  {isNew && <span className="pill warn">New</span>}
                </div>
                <ul className="release-notes">
                  {release.highlights.map((h) => (
                    <li key={h}>
                      <span className="tick">
                        <Icon name="check" />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
