import type { IntegrationCategory } from "@prisma/client";
import { requirePlatformAdmin } from "@/lib/admin";
import { listIntegrations, type IntegrationView } from "@/lib/integrations/store";
import { CATEGORY_LABELS, type IntegrationField } from "@/lib/integrations/registry";
import { Icon } from "@/components/Icon";
import { saveIntegrationAction, sendTestEmailAction } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER: IntegrationCategory[] = [
  "EMAIL",
  "PAYMENTS",
  "OAUTH",
  "AI",
  "STORAGE",
  "WEBHOOKS",
  "GENERAL",
];

function renderConfigField(field: IntegrationField, value: unknown, key: string) {
  const id = `${key}__${field.name}`;
  const name = `config__${field.name}`;

  if (field.type === "boolean") {
    return (
      <label className="check-row" htmlFor={id} key={id}>
        <input id={id} type="checkbox" name={name} defaultChecked={Boolean(value)} />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div className="field" key={id}>
        <label htmlFor={id}>{field.label}</label>
        <select id={id} name={name} defaultValue={String(value ?? "")}>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="field" key={id}>
        <label htmlFor={id}>{field.label}</label>
        <textarea id={id} name={name} rows={3} placeholder={field.placeholder} defaultValue={String(value ?? "")} />
      </div>
    );
  }

  return (
    <div className="field" key={id}>
      <label htmlFor={id}>{field.label}</label>
      <input
        id={id}
        name={name}
        type={field.type === "number" ? "number" : "text"}
        placeholder={field.placeholder}
        defaultValue={String(value ?? "")}
      />
    </div>
  );
}

function IntegrationCard({ view }: { view: IntegrationView }) {
  const { def } = view;
  const status = view.enabled ? "status-RESOLVED" : "status-CLOSED";
  return (
    <section className="card" key={def.key}>
      <div className="card-head">
        <div className="cell-user">
          <span className="stat-icon">
            <Icon name={def.icon} />
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>{def.name}</h2>
            <div className="cell-sub">{def.description}</div>
          </div>
        </div>
        <span className={`badge ${status}`}>{view.enabled ? "enabled" : "disabled"}</span>
      </div>

      <form action={saveIntegrationAction} className="stack" style={{ gap: 14 }}>
        <input type="hidden" name="key" value={def.key} />
        <label className="check-row" htmlFor={`${def.key}__enabled`}>
          <input id={`${def.key}__enabled`} type="checkbox" name="enabled" defaultChecked={view.enabled} />
          <span>Enable this integration</span>
        </label>

        {def.config.map((field) => renderConfigField(field, view.config[field.name], def.key))}

        {def.secrets.length > 0 && (
          <>
            <div className="divider" style={{ margin: "2px 0" }} />
            {def.secrets.map((field) => (
              <div className="field" key={`${def.key}__${field.name}`}>
                <label htmlFor={`${def.key}__${field.name}`}>{field.label}</label>
                <input
                  id={`${def.key}__${field.name}`}
                  name={`secret__${field.name}`}
                  type="password"
                  autoComplete="new-password"
                  placeholder={view.secrets[field.name] ?? "Not set"}
                />
                <div className="hint">
                  {view.secrets[field.name]
                    ? "Stored securely — leave blank to keep the current value."
                    : "No value stored yet."}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="row" style={{ gap: 10 }}>
          <button className="btn" type="submit">
            Save {def.name}
          </button>
        </div>
      </form>

      {def.key === "smtp" && (
        <form action={sendTestEmailAction} style={{ marginTop: 12 }}>
          <button className="btn secondary sm" type="submit">
            <Icon name="send" size={15} /> Send test email to me
          </button>
        </form>
      )}
    </section>
  );
}

export default async function AdminIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const views = await listIntegrations();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Integrations</h1>
          <p className="page-sub">
            Connect email, payments, SSO and more. Credentials are encrypted at rest.
          </p>
        </div>
      </div>

      {sp.ok && (
        <div className="alert success">
          <Icon name="check" />
          <span>
            {sp.ok === "smtp-test" ? "Test email sent." : "Integration saved."}
          </span>
        </div>
      )}
      {sp.error && (
        <div className="alert error">
          <Icon name="alert" />
          <span>
            {sp.error === "smtp-test"
              ? "Could not send the test email — check your SMTP settings."
              : "That integration could not be saved."}
          </span>
        </div>
      )}

      {CATEGORY_ORDER.map((category) => {
        const items = views.filter((v) => v.def.category === category);
        if (items.length === 0) return null;
        return (
          <div key={category} style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid cols-2" style={{ alignItems: "start" }}>
              {items.map((view) => (
                <IntegrationCard key={view.def.key} view={view} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
