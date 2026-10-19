import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { Counter } from "@/components/Counter";
import { HeroVisual } from "@/components/HeroVisual";
import { RELEASES, LATEST_VERSION } from "@/lib/releases";
import {
  ArtAutomation,
  ArtChat,
  ArtInbox,
  ArtKnowledge,
  ArtReports,
  ArtSecurity,
  ArtSla,
  HeroDecor,
} from "@/components/illustrations";

const capabilities: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "inbox",
    title: "Unified inbox",
    body: "Queues, saved views, bulk actions and assignment keep every request owned.",
  },
  {
    icon: "clock",
    title: "Ticketing & SLAs",
    body: "First-response and resolution targets with business hours, holidays and pause rules.",
  },
  {
    icon: "chat",
    title: "Live chat",
    body: "Route visitors to available teams and fall back to ticket creation when offline.",
  },
  {
    icon: "book",
    title: "Knowledge base",
    body: "Draft, review and publish articles that deflect repeat questions.",
  },
  {
    icon: "bolt",
    title: "Automation",
    body: "Trigger / condition / action rules with test mode and run history.",
  },
  {
    icon: "chart",
    title: "Reporting",
    body: "Volume, backlog, response and resolution, SLA attainment and CSAT.",
  },
];

const stats = [
  { num: "6", lbl: "modules ready on day one" },
  { num: "100%", lbl: "server-side tenant isolation" },
  { num: "AA", lbl: "WCAG 2.2 accessibility" },
  { num: "SSO", lbl: "and audit trails included" },
];

const illustrated: { art: typeof ArtChat; title: string; body: string }[] = [
  { art: ArtChat, title: "Conversation that flows", body: "Chronological public and private messages with safe rendering and notifications." },
  { art: ArtKnowledge, title: "Answer once, help many", body: "A reviewed knowledge base that deflects repeat questions before they reach your team." },
  { art: ArtReports, title: "Measure what matters", body: "Role-filtered analytics across volume, backlog, response, resolution and CSAT." },
  { art: ArtAutomation, title: "Automate the repetitive", body: "Trigger / condition / action rules with test mode, loop prevention and run history." },
  { art: ArtInbox, title: "A portal for your customers", body: "A branded self-service portal where customers track requests and reply securely." },
  { art: ArtSecurity, title: "Isolation by default", body: "Tenant isolation enforced on the server, with hashed sessions and adaptive credentials." },
];

export default function HomePage() {
  return (
    <>
      <section className="lux-hero">
        <div className="aurora" aria-hidden="true" />
        <HeroDecor className="hero-decor" />
        <div className="container lux-hero-inner">
          <div className="reveal">
            <span className="hero-kicker">Multi-tenant support platform</span>
            <h1 className="hero-title">
              Customer support,
              <br />
              <span className="gold">organized</span> <span className="thin">end to end.</span>
            </h1>
            <p className="hero-lead">
              HelpDeskFlow gives your team one refined workspace to receive, answer and measure every
              support request — with strict tenant isolation enforced on the server.
            </p>
            <div className="hero-cta">
              <Link href="/register" className="btn gold">
                Start free trial <Icon name="arrow-right" />
              </Link>
              <Link href="/login" className="btn lux-ghost">
                Sign in
              </Link>
            </div>
            <div className="hero-proof">
              <span className="p">
                <Icon name="lock" /> Server-side tenant isolation
              </span>
              <span className="p">
                <Icon name="sparkles" /> AI chat from your docs
              </span>
              <span className="p">
                <Icon name="bolt" /> Automation &amp; SLA ready
              </span>
              <span className="p">
                <Icon name="check" /> No credit card required
              </span>
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      <div className="trust">
        <div className="trust-inner">
          {[
            "Email",
            "Customer portal",
            "Live chat",
            "Online payments",
            "Email verification",
            "SLA policies",
            "Automation",
            "Knowledge base",
            "Reporting",
            "SSO & audit",
            "Email",
            "Customer portal",
            "Live chat",
            "Online payments",
            "Email verification",
            "SLA policies",
            "Automation",
            "Knowledge base",
            "Reporting",
            "SSO & audit",
          ].map((name, i) => (
            <span key={`${name}-${i}`} aria-hidden={i > 9}>
              {name}
            </span>
          ))}
        </div>
      </div>

      <section className="section cream">
        <div className="container">
          <div className="section-head">
            <div className="ornament">
              <span className="diamond" />
            </div>
            <span className="eyebrow">Capabilities</span>
            <h2>Everything a support team needs</h2>
            <p>Core capabilities, available in a single unified workspace.</p>
          </div>
          <div className="grid cols-3">
            {capabilities.map((f, i) => (
              <div className={`feature-card reveal delay-${(i % 3) + 1}`} key={f.title}>
                <span className="feature-icon">
                  <Icon name={f.icon} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container showcase">
          <div className="showcase-copy">
            <span className="eyebrow">Unified workspace</span>
            <h2>One inbox, every channel</h2>
            <p>
              Email, portal, chat and payment requests land in a single queue where ownership, priority
              and history are always clear.
            </p>
            <ul className="checklist">
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Shared queues with saved views and bulk actions
              </li>
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Assignment, tagging and priority at a glance
              </li>
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Full audit trail on every ticket event
              </li>
            </ul>
          </div>
          <div className="showcase-art">
            <ArtInbox />
          </div>
        </div>
      </section>

      <section className="section cream">
        <div className="container showcase reverse">
          <div className="showcase-copy">
            <span className="eyebrow">Service levels</span>
            <h2>Never miss an SLA again</h2>
            <p>
              First-response and resolution targets adapt to business hours, holidays and pause
              rules, with escalation before a breach.
            </p>
            <ul className="checklist">
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Business calendars and pause / resume logic
              </li>
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Rolling attainment and breach forecasting
              </li>
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Escalation paths tuned per team
              </li>
            </ul>
          </div>
          <div className="showcase-art">
            <ArtSla />
          </div>
        </div>
      </section>

      <section className="section ink">
        <div className="container">
          <div className="section-head">
            <div className="ornament">
              <span className="diamond" />
            </div>
            <span className="eyebrow" style={{ color: "var(--gold-2)" }}>
              Engineering
            </span>
            <h2>Premium craft, disciplined engineering</h2>
            <p>Engineered for speed and accessibility, wrapped in a refined interface.</p>
          </div>
          <div className="stats-band">
            {stats.map((s) => (
              <div className="stat-item" key={s.lbl}>
                <div className="num">
                  <Counter value={s.num} />
                </div>
                <div className="lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="ornament">
              <span className="diamond" />
            </div>
            <span className="eyebrow">Across the journey</span>
            <h2>Designed for every step</h2>
            <p>From the first reply to the report your leadership reads on Monday morning.</p>
          </div>
          <div className="grid cols-2">
            {illustrated.map((f, i) => {
              const Art = f.art;
              return (
                <div className={`feature-card reveal delay-${(i % 2) + 1}`} key={f.title}>
                  <Art style={{ marginBottom: 20 }} />
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container showcase">
          <div className="showcase-copy">
            <span className="eyebrow">AI assistant</span>
            <h2>Answer instantly, straight from your docs</h2>
            <p>
              Drop one script tag on your website and visitors get an assistant that answers only
              from your published knowledge base — with a human handoff that becomes a ticket.
            </p>
            <ul className="checklist">
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Grounded answers with article citations, never invented policies
              </li>
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Live editor for accent, launcher and welcome — preview before you ship
              </li>
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                “Talk to a human” creates a ticket in the same SLA pipeline
              </li>
            </ul>
            <Link href="/register" className="btn gold">
              Try the assistant <Icon name="arrow-right" />
            </Link>
          </div>
          <div className="showcase-art">
            <ArtChat />
          </div>
        </div>
      </section>

      <section className="section cream">
        <div className="container">
          <div className="section-head">
            <div className="ornament">
              <span className="diamond" />
            </div>
            <span className="eyebrow">Always improving</span>
            <h2>Every workspace, always current</h2>
            <p>
              New features ship continuously. Each workspace is prompted to update and upgrades to
              the latest release in one click — no migrations, no downtime.
            </p>
          </div>
          <div className="grid cols-2">
            <div className="showcase-copy">
              <ul className="checklist">
                <li>
                  <span className="tick">
                    <Icon name="check" />
                  </span>
                  An in-app update center shows exactly what&apos;s new
                </li>
                <li>
                  <span className="tick">
                    <Icon name="check" />
                  </span>
                  One-click upgrade keeps your data, settings and members
                </li>
                <li>
                  <span className="tick">
                    <Icon name="check" />
                  </span>
                  The website chat engine updates along with the workspace
                </li>
              </ul>
            </div>
            <div className="release-stack">
              {RELEASES.slice(0, 3).map((release, i) => (
                <div className={`release${i === 0 ? " release--current" : ""}`} key={release.version}>
                  <div className="release-head">
                    <span className={`release-version${i === 0 ? " is-current" : ""}`}>
                      v{release.version}
                    </span>
                    <div>
                      <strong>{release.title}</strong>
                      <span className="release-date">{release.date}</span>
                    </div>
                    {i === 0 && <span className="pill ok">Latest</span>}
                  </div>
                  <ul className="release-notes">
                    {release.highlights.slice(0, 3).map((h) => (
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
          </div>
          <p className="muted" style={{ textAlign: "center", marginTop: 22 }}>
            Current release: v{LATEST_VERSION}
          </p>
        </div>
      </section>

      <section className="section ink">
        <div className="container">
          <div className="section-head">
            <div className="ornament">
              <span className="diamond" />
            </div>
            <span className="eyebrow" style={{ color: "var(--gold-2)" }}>
              Trust &amp; security
            </span>
            <h2>Secure by default, provable by design</h2>
            <p>Guards that hold on every request, in every workspace.</p>
          </div>
          <div className="grid cols-3">
            {[
              { icon: "lock" as const, title: "Tenant isolation", body: "Every query is scoped to the active organization — enforced server-side, not in the UI." },
              { icon: "shield" as const, title: "2FA & SSO", body: "TOTP two-factor with backup codes, plus single sign-on and role-based access." },
              { icon: "document" as const, title: "Audit trail", body: "Immutable log of every privileged action, filterable and exportable." },
              { icon: "eye" as const, title: "Data rights", body: "One-click GDPR export and right-to-erasure for any customer." },
              { icon: "bolt" as const, title: "Signed webhooks", body: "Outbound events delivered with HMAC signatures and automatic retries." },
              { icon: "mail" as const, title: "Verified email", body: "Domain rules and verification keep sign-up and replies trustworthy." },
            ].map((s, i) => (
              <div className={`feature-card reveal delay-${(i % 3) + 1}`} key={s.title}>
                <span className="feature-icon">
                  <Icon name={s.icon} />
                </span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="ornament">
              <span className="diamond" />
            </div>
            <span className="eyebrow">Connects to your stack</span>
            <h2>Works with the tools you already use</h2>
            <p>Bring payments, email, AI and automation together from one place.</p>
          </div>
          <div className="integration-grid">
            {[
              "Razorpay payments",
              "SMTP & transactional email",
              "Embeddable chat widget",
              "OpenAI-compatible AI",
              "Outbound webhooks",
              "Google Tag Manager",
              "WordPress / Shopify / Webflow",
              "REST API & audit export",
            ].map((name) => (
              <span key={name} className="integration-chip">
                <Icon name="check" /> {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section cream">
        <div className="container">
          <div className="section-head">
            <div className="ornament">
              <span className="diamond" />
            </div>
            <span className="eyebrow">Questions</span>
            <h2>Frequently asked</h2>
            <p>Short answers to the things teams ask before they start.</p>
          </div>
          <div className="faq">
            {[
              { q: "Is there a free plan?", a: "Yes. The Free plan includes the core workspace with agents and a monthly ticket allowance — no credit card required. Paid plans unlock higher limits, more agents and advanced controls." },
              { q: "How is my data kept separate from other tenants?", a: "Tenant isolation is enforced on the server for every request; a workspace can only ever read its own records. Sessions are hashed, secrets encrypted and privileged actions audited." },
              { q: "How do I add the chat widget to my website?", a: "Open the Chat widget page, copy the one-line snippet and paste it before the closing body tag (or via a tag manager). Customise the look with a live preview, then allowlist your domain." },
              { q: "What happens when you release a new version?", a: "Your workspace shows an update prompt with the release notes. One click upgrades you to the latest version and updates the chat engine — your data and settings are preserved." },
              { q: "Can the AI answer customer questions?", a: "Yes — it answers only from your published knowledge base and cites the article it used. If it can't find an answer, it hands off to a human and opens a ticket." },
              { q: "Do you support payments and billing?", a: "Self-serve billing and online payments are built in, with recurring subscriptions, grace periods and automatic downgrade handled for you." },
            ].map((item) => (
              <details className="faq-item" key={item.q}>
                <summary>
                  {item.q}
                  <span className="faq-mark">
                    <Icon name="arrow-right" />
                  </span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-panel">
            <div>
              <h2>Ready to get started?</h2>
              <p>
                Create your organization in under a minute and invite your team and customers to a
                single, organized workspace.
              </p>
            </div>
            <div className="cta-actions">
              <Link href="/register" className="btn gold">
                Start free trial <Icon name="arrow-right" />
              </Link>
              <Link href="/features" className="btn lux-ghost">
                Explore features
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
