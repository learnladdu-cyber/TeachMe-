import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { getOrgReport, formatDuration, RANGES, type ReportRange } from "@/lib/reports";
import { Icon } from "@/components/Icon";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { ArtReports } from "@/components/illustrations";

export const dynamic = "force-dynamic";

const RANGE_KEYS = RANGES.map((r) => r.key);

function toneFor(key: string): string {
  if (["URGENT", "HIGH"].includes(key)) return "rose";
  if (["NEW", "ON_HOLD"].includes(key)) return "";
  if (["RESOLVED", "CLOSED"].includes(key)) return "green";
  if (["PENDING"].includes(key)) return "amber";
  return "";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const range: ReportRange = RANGE_KEYS.includes(sp.range as ReportRange)
    ? (sp.range as ReportRange)
    : "30d";

  const report = await getOrgReport(ctx.organizationId, range);
  const maxDay = Math.max(1, ...report.buckets.map((b) => b.count));
  const maxBreakdown = Math.max(
    1,
    ...report.byStatus.map((r) => r.count),
    ...report.byPriority.map((r) => r.count),
    ...report.byChannel.map((r) => r.count),
  );

  const kpis = [
    { label: "Tickets created", value: report.total, icon: "ticket" as const, tone: "gold" },
    { label: "Open backlog", value: report.openCount, icon: "inbox" as const, tone: "amber" },
    { label: "Resolved / closed", value: report.closedCount, icon: "check" as const, tone: "green" },
    { label: "Resolution rate", value: `${report.resolutionRate}%`, icon: "chart" as const, tone: "" },
  ];

  const peak = report.buckets.reduce((a, b) => (b.count > a.count ? b : a), report.buckets[0]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p className="page-sub">
            Volume, backlog and throughput for the selected window · avg resolution{" "}
            {formatDuration(report.avgResolutionMs)}
          </p>
        </div>
        <div className="segmented">
          {RANGES.map((r) => (
            <Link key={r.key} href={`/app/reports?range=${r.key}`} className={range === r.key ? "on" : ""}>
              {r.label}
            </Link>
          ))}
        </div>
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

      <div className="split">
        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <h3 className="card-title">Created per day</h3>
            {range === "all" ? (
              <div className="row" style={{ gap: 14 }}>
                <ArtReports style={{ maxWidth: 320 }} />
                <p className="muted" style={{ flex: 1, minWidth: 200 }}>
                  Daily trend is shown for a bounded window. Pick 7, 30 or 90 days to chart volume
                  over time.
                </p>
              </div>
            ) : (
              <>
                <div className="mini-chart">
                  {report.buckets.map((b) => (
                    <div
                      key={b.day}
                      className="col"
                      style={{ height: `${Math.max(2, (b.count / maxDay) * 100)}%` }}
                      title={`${b.label}: ${b.count}`}
                    />
                  ))}
                </div>
                <div className="row between" style={{ marginTop: 10, fontSize: 12 }}>
                  <span className="muted">{report.buckets[0]?.label}</span>
                  <span className="muted">
                    peak {peak?.count ?? 0} on {peak?.label}
                  </span>
                  <span className="muted">{report.buckets[report.buckets.length - 1]?.label}</span>
                </div>
              </>
            )}
          </div>

          <div className="grid cols-2">
            <div className="card">
              <h3 className="card-title">By status</h3>
              {report.byStatus.length === 0 ? (
                <p className="muted">No tickets in this window.</p>
              ) : (
                report.byStatus.map((r) => (
                  <div className="bar-row" key={r.key}>
                    <div className="bar-top">
                      <StatusBadge status={r.key} />
                      <span>{r.count}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${(r.count / maxBreakdown) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h3 className="card-title">By priority</h3>
              {report.byPriority.length === 0 ? (
                <p className="muted">No tickets in this window.</p>
              ) : (
                report.byPriority.map((r) => (
                  <div className="bar-row" key={r.key}>
                    <div className="bar-top">
                      <PriorityBadge priority={r.key} />
                      <span>{r.count}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${(r.count / maxBreakdown) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">By channel</h3>
            <div className="grid cols-3">
              {report.byChannel.length === 0 ? (
                <p className="muted">No tickets in this window.</p>
              ) : (
                report.byChannel.map((r) => (
                  <div className="stat-card" key={r.key} style={{ alignItems: "center" }}>
                    <span className={`stat-icon ${toneFor(r.key)}`}>
                      <Icon name={r.key === "EMAIL" ? "mail" : r.key === "CHAT" ? "chat" : "user"} />
                    </span>
                    <div>
                      <div className="stat-label">{r.key.toLowerCase()}</div>
                      <div className="stat-value">{r.count}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <h3 className="card-title">Top requesters</h3>
            {report.topRequesters.length === 0 ? (
              <p className="muted">No data yet.</p>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                {report.topRequesters.map((u) => (
                  <div className="meta-item" key={u.id} style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}</div>
                      <div className="cell-sub" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.email}
                      </div>
                    </div>
                    <strong>{u.count}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Agent workload</h3>
            {report.workload.length === 0 ? (
              <p className="muted">No assignments yet.</p>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                {report.workload.map((u) => (
                  <div key={u.id} className="bar-row" style={{ marginBottom: 0 }}>
                    <div className="bar-top">
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                      <span>{u.count}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${(u.count / report.workload[0].count) * 100}%` }}
                      />
                    </div>
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
