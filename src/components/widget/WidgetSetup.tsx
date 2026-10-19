"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";

type Initial = {
  enabled: boolean;
  welcome: string;
  accent: string;
  launcherLabel: string;
  position: "left" | "right";
  allowedOrigins: string;
};

type Props = {
  widgetKey: string;
  embedUrl: string;
  previewPath: string;
  snippet: string;
  organizationName: string;
  initial: Initial;
  saveAction: (formData: FormData) => void | Promise<void>;
};

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [value]);

  return (
    <button type="button" className="btn ghost sm" onClick={copy} title={label}>
      <Icon name={copied ? "check" : "document"} />
      {copied ? "Copied" : label}
    </button>
  );
}

export function WidgetSetup({
  widgetKey,
  embedUrl,
  previewPath,
  snippet,
  organizationName,
  initial,
  saveAction,
}: Props) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [welcome, setWelcome] = useState(initial.welcome);
  const [accent, setAccent] = useState(initial.accent);
  const [launcherLabel, setLauncherLabel] = useState(initial.launcherLabel);
  const [position, setPosition] = useState<"left" | "right">(initial.position);
  const [origins, setOrigins] = useState(initial.allowedOrigins);

  // Debounced mirror of the cosmetic fields so the preview reloads smoothly
  // while the brand types rather than on every keystroke.
  const [preview, setPreview] = useState({
    accent: initial.accent,
    welcome: initial.welcome,
    label: initial.launcherLabel,
    position: initial.position,
    enabled: initial.enabled,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPreview({
        accent,
        welcome,
        label: launcherLabel,
        position,
        enabled,
      });
    }, 450);
    return () => window.clearTimeout(handle);
  }, [accent, welcome, launcherLabel, position, enabled]);

  const previewSrc = useMemo(() => {
    const qs = new URLSearchParams({
      preview: "1",
      accent: preview.accent,
      welcome: preview.welcome,
      label: preview.label,
      position: preview.position,
      n: String(nonce),
    });
    return `${previewPath}?${qs.toString()}`;
  }, [previewPath, preview, nonce]);

  const dirty =
    enabled !== initial.enabled ||
    welcome !== initial.welcome ||
    accent !== initial.accent ||
    launcherLabel !== initial.launcherLabel ||
    position !== initial.position ||
    origins !== initial.allowedOrigins;

  function reset() {
    setEnabled(initial.enabled);
    setWelcome(initial.welcome);
    setAccent(initial.accent);
    setLauncherLabel(initial.launcherLabel);
    setPosition(initial.position);
    setOrigins(initial.allowedOrigins);
  }

  return (
    <div className="split">
      <div className="stack" style={{ gap: 18 }}>
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Add the widget to your site</h3>
            <span className={`pill ${enabled ? "ok" : "warn"}`}>
              {enabled ? "Live" : "Turned off"}
            </span>
          </div>

          <ol className="setup-steps">
            <li>
              <span className="step-num">1</span>
              <div>
                <strong>Publish knowledge base articles</strong>
                <p className="muted">
                  The assistant answers only from your published docs. Add or update them in the
                  Knowledge base — anything unpublished stays private.
                </p>
              </div>
            </li>
            <li>
              <span className="step-num">2</span>
              <div>
                <strong>Paste this snippet</strong>
                <p className="muted">
                  Drop it just before the closing <span className="code">&lt;/body&gt;</span> tag on
                  every page (or in your site template / tag manager).
                </p>
              </div>
            </li>
            <li>
              <span className="step-num">3</span>
              <div>
                <strong>Customise &amp; test</strong>
                <p className="muted">
                  Edit the look below and watch the live preview, then allowlist your domain.
                </p>
              </div>
            </li>
          </ol>

          <div className="snippet">
            <pre className="snippet-code">{snippet}</pre>
            <CopyButton value={snippet} label="Copy snippet" />
          </div>

          <div className="divider" />

          <div className="meta-item">
            <span className="k">Widget key</span>
            <span className="v" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="code">{widgetKey}</span>
              <CopyButton value={widgetKey} label="Copy key" />
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Edit the widget</h3>
            {dirty && <span className="pill warn">Unsaved changes</span>}
          </div>

          <form action={saveAction} className="stack" style={{ gap: 14 }}>
            <label className="checkbox-row">
              <input
                type="checkbox"
                name="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>Enable the chat widget on your site</span>
            </label>

            <div className="field">
              <label htmlFor="welcome">Welcome message</label>
              <input
                id="welcome"
                name="welcome"
                value={welcome}
                maxLength={240}
                onChange={(e) => setWelcome(e.target.value)}
              />
              <div className="hint">The visitor’s first message when the chat opens.</div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="launcherLabel">Launcher label</label>
                <input
                  id="launcherLabel"
                  name="launcherLabel"
                  value={launcherLabel}
                  maxLength={60}
                  onChange={(e) => setLauncherLabel(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="position">Launcher position</label>
                <select
                  id="position"
                  name="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value === "left" ? "left" : "right")}
                >
                  <option value="right">Bottom right</option>
                  <option value="left">Bottom left</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="accent">Accent colour</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  id="accent"
                  name="accent"
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  style={{ width: 64, height: 40, padding: 4 }}
                />
                <span className="code">{accent}</span>
              </div>
            </div>

            <div className="field">
              <label htmlFor="allowedOrigins">Allowed domains</label>
              <textarea
                id="allowedOrigins"
                name="allowedOrigins"
                rows={3}
                placeholder={"https://example.com\nhttps://shop.example.com"}
                value={origins}
                onChange={(e) => setOrigins(e.target.value)}
              />
              <div className="hint">
                One origin per line. Leave empty to allow any site — lock this down once you go live.
              </div>
            </div>

            <div className="row-actions">
              <button className="btn gold" type="submit">
                <Icon name="check" /> Save changes
              </button>
              <button className="btn ghost" type="button" onClick={reset} disabled={!dirty}>
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Install anywhere</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            The same snippet works on any platform — paste it into your theme, template, or a tag
            manager.
          </p>
          <div className="platform-grid">
            {[
              "WordPress / WooCommerce",
              "Shopify",
              "Webflow",
              "Squarespace",
              "Wix",
              "Next.js / React",
              "Google Tag Manager",
              "Custom HTML",
            ].map((name) => (
              <span key={name} className="platform-chip">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="stack" style={{ gap: 18 }}>
        <div className="card" style={{ position: "sticky", top: 18 }}>
          <div className="card-head">
            <h3 className="card-title">Live preview</h3>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setNonce((n) => n + 1)}
              title="Reload preview"
            >
              <Icon name="play" /> Reload
            </button>
          </div>

          <div className="preview">
            <div className="preview-bar">
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-url">your-site.com</span>
            </div>
            <div className="preview-body">
              <p className="preview-copy">{organizationName} — your website content</p>
              {preview.enabled ? (
                <iframe
                  key={`${previewSrc}`}
                  src={previewSrc}
                  title={`Chat widget preview for ${organizationName}`}
                  className="preview-frame"
                  style={{ [preview.position === "left" ? "left" : "right"]: 18 } as React.CSSProperties}
                  allow="clipboard-write"
                />
              ) : (
                <div className="preview-off">
                  <Icon name="alert" />
                  <span>The widget is turned off. Enable it to preview.</span>
                </div>
              )}
              <div
                className="preview-launcher"
                style={{
                  background: preview.accent,
                  [preview.position === "left" ? "left" : "right"]: 18,
                } as React.CSSProperties}
              >
                <Icon name="chat" />
              </div>
            </div>
          </div>

          <div className="row-actions">
            <a className="btn ghost" href={embedUrl} target="_blank" rel="noreferrer">
              <Icon name="eye" /> Open full page
            </a>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {launcherLabel} · {position}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
