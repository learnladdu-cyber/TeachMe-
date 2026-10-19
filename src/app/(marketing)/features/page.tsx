import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { ArtAutomation, ArtInbox, ArtSecurity, ArtSla } from "@/components/illustrations";

const features: { icon: IconName; title: string; body: string }[] = [
  { icon: "ticket", title: "Ticketing", body: "Create, assign, prioritize, tag, search, reply, add internal notes, transition status and reopen." },
  { icon: "chat", title: "Conversation", body: "Chronological public/private messages, safe rendering and notifications." },
  { icon: "inbox", title: "Routing", body: "Rules by channel, category, priority, team and hours, with a required fallback queue." },
  { icon: "headset", title: "Live chat", body: "Availability, queue, transfer, offline fallback, transcripts and agent presence." },
  { icon: "book", title: "Knowledge base", body: "Draft / review / publish, version history, search, categories and feedback." },
  { icon: "bolt", title: "Automation", body: "Triggers, conditions and actions with test mode, loop prevention and execution logs." },
  { icon: "clock", title: "SLA", body: "First-response and resolution targets, business calendars, pause/resume and escalation." },
  { icon: "chart", title: "Analytics", body: "Role-filtered metrics, date ranges, timezone handling and exports." },
  { icon: "life-buoy", title: "Billing", body: "Plans, entitlements, invoices, usage, grace periods and verified webhooks." },
  { icon: "mail", title: "Notifications", body: "Email verification and in-app preferences, deduplication, retry and delivery status." },
  { icon: "lock", title: "Security", body: "TLS, adaptive password hashing, session rotation and server-side tenant authorization." },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="section ink" style={{ paddingBottom: 56 }}>
        <div className="container">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div className="ornament">
              <span className="diamond" />
            </div>
            <span className="eyebrow" style={{ color: "var(--gold-2)" }}>
              Product
            </span>
            <h2>Everything, considered</h2>
            <p>The functional requirements behind HelpDeskFlow, grouped by area.</p>
          </div>
        </div>
      </section>

      <section className="section cream">
        <div className="container">
          <div className="grid cols-3">
            {features.map((f, i) => (
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
            <span className="eyebrow">Under the hood</span>
            <h2>Engineered for isolation and scale</h2>
            <p>
              Every read and write is checked against the caller&apos;s tenant on the server, so a
              cross-tenant request can never succeed — even from a crafted request.
            </p>
            <ul className="checklist">
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Server-side authorization on all ticket paths
              </li>
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Hashed sessions with rotation and revocation
              </li>
              <li>
                <span className="tick">
                  <Icon name="check" />
                </span>
                Immutable audit trail for governance
              </li>
            </ul>
          </div>
          <div className="showcase-art">
            <ArtSecurity />
          </div>
        </div>
      </section>

      <section className="section cream">
        <div className="container">
          <div className="section-head">
            <div className="ornament">
              <span className="diamond" />
            </div>
            <span className="eyebrow">In practice</span>
            <h2>From request to resolution</h2>
            <p>A few of the surfaces your team and customers will live in every day.</p>
          </div>
          <div className="grid cols-3">
            <div className="feature-card reveal">
              <ArtInbox style={{ marginBottom: 20 }} />
              <h3>Shared inbox</h3>
              <p>Queues, saved views and bulk actions keep the backlog honest.</p>
            </div>
            <div className="feature-card reveal delay-1">
              <ArtSla style={{ marginBottom: 20 }} />
              <h3>Service levels</h3>
              <p>Response and resolution clocks that respect business hours.</p>
            </div>
            <div className="feature-card reveal delay-2">
              <ArtAutomation style={{ marginBottom: 20 }} />
              <h3>Automation</h3>
              <p>Rules that route, tag and escalate without a human in the loop.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-panel">
            <div>
              <h2>See it working, not just listed</h2>
              <p>Create an organization and put the core journeys to work in minutes.</p>
            </div>
            <Link href="/register" className="btn gold">
              Start free trial <Icon name="arrow-right" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
