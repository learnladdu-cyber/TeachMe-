import { requireStaff } from "@/lib/guard";
import {
  ACTIONS,
  CONDITION_FIELDS,
  TRIGGERS,
  actionLabel,
  asActions,
  asConditions,
  countMatches,
  listRules,
  triggerLabel,
} from "@/lib/automation";
import { Icon } from "@/components/Icon";
import { ArtAutomation } from "@/components/illustrations";
import { createRuleAction, deleteRuleAction, toggleRuleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;

  const rules = await listRules(ctx.organizationId);
  const matches = await Promise.all(rules.map((r) => countMatches(ctx.organizationId, r.id)));

  const enabledCount = rules.filter((r) => r.enabled).length;
  const totalRuns = rules.reduce((a, r) => a + r.runCount, 0);
  const totalMatches = matches.reduce((a, b) => a + b, 0);

  const kpis = [
    { label: "Rules", value: rules.length, icon: "bolt" as const, tone: "gold" },
    { label: "Enabled", value: enabledCount, icon: "check" as const, tone: "green" },
    { label: "Dry-run matches", value: totalMatches, icon: "eye" as const, tone: "" },
    { label: "Recorded runs", value: totalRuns, icon: "play" as const, tone: "amber" },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Automation</h1>
          <p className="page-sub">
            Trigger · condition · action rules with a live dry-run against your recent tickets.
          </p>
        </div>
      </div>

      {sp.created && (
        <div className="alert success">
          <Icon name="check" />
          <span>Automation rule created.</span>
        </div>
      )}
      {sp.error === "missing" && (
        <div className="alert error">
          <Icon name="alert" />
          <span>A name and valid trigger are required.</span>
        </div>
      )}

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
        <div>
          {rules.length === 0 ? (
            <div className="empty">
              <ArtAutomation style={{ width: 260, margin: "0 auto 14px" }} />
              <h3>No automation yet</h3>
              <p>Create a rule to route, prioritize and escalate without manual work.</p>
            </div>
          ) : (
            rules.map((rule, i) => {
              const conditions = asConditions(rule.conditions);
              const actions = asActions(rule.actions);
              return (
                <div className="row-card" key={rule.id} style={{ alignItems: "flex-start" }}>
                  <form action={toggleRuleAction} style={{ marginTop: 2 }}>
                    <input type="hidden" name="id" value={rule.id} />
                    <input type="hidden" name="enabled" value={(!rule.enabled).toString()} />
                    <button
                      className={`toggle ${rule.enabled ? "on" : ""}`}
                      type="submit"
                      title={rule.enabled ? "Disable rule" : "Enable rule"}
                      aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
                    />
                  </form>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row between" style={{ gap: 10 }}>
                      <strong style={{ fontSize: 14.5 }}>{rule.name}</strong>
                      <span className="muted" style={{ fontSize: 12.5 }}>
                        {matches[i]} matching ticket{matches[i] === 1 ? "" : "s"} in last 200
                      </span>
                    </div>

                    <div className="rule-flow" style={{ marginTop: 10 }}>
                      <span className="rule-chip trigger">{triggerLabel(rule.trigger)}</span>
                      {conditions.length === 0 && <span className="rule-chip">no conditions</span>}
                      {conditions.map((c, idx) => (
                        <span className="rule-chip" key={idx}>
                          {c.field} {c.operator} “{c.value}”
                        </span>
                      ))}
                      <span className="rule-arrow">
                        <Icon name="arrow-right" size={14} />
                      </span>
                      {actions.length === 0 && <span className="rule-chip">no actions</span>}
                      {actions.map((a, idx) => (
                        <span className="rule-chip action" key={idx}>
                          {actionLabel(a.type)}
                          {a.value ? `: ${a.value}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>

                  <form action={deleteRuleAction}>
                    <input type="hidden" name="id" value={rule.id} />
                    <button className="icon-btn" type="submit" title="Delete rule">
                      <Icon name="trash" />
                    </button>
                  </form>
                </div>
              );
            })
          )}
        </div>

        <form action={createRuleAction} className="card">
          <h3 className="card-title">
            <Icon name="plus" size={16} /> New rule
          </h3>
          <div className="stack" style={{ gap: 14 }}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" placeholder="Escalate urgent billing" required />
            </div>
            <div className="field">
              <label htmlFor="trigger">Trigger</label>
              <select id="trigger" name="trigger" defaultValue="ticket.created">
                {TRIGGERS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="divider" style={{ margin: "2px 0" }} />
            <div className="field">
              <label>Condition</label>
              <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                <select name="conditionField" defaultValue="priority" style={{ flex: 1 }}>
                  {CONDITION_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <select name="conditionOperator" defaultValue="equals" style={{ flex: 1 }}>
                  <option value="equals">equals</option>
                  <option value="contains">contains</option>
                </select>
              </div>
              <input
                name="conditionValue"
                placeholder="Value (e.g. URGENT)"
                style={{ marginTop: 8 }}
              />
            </div>

            <div className="divider" style={{ margin: "2px 0" }} />
            <div className="field">
              <label>Action</label>
              <select name="actionType" defaultValue="set_priority">
                {ACTIONS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
              <input
                name="actionValue"
                placeholder="Value (e.g. HIGH, team-lead)"
                style={{ marginTop: 8 }}
              />
            </div>

            <button className="btn gold block" type="submit">
              <Icon name="bolt" /> Create rule
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
