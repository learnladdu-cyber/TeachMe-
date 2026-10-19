import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ArtReports } from "@/components/illustrations";

type Plan = {
  name: string;
  price: string;
  cadence?: string;
  tagline: string;
  features: string[];
  popular?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "₹0",
    cadence: "forever",
    tagline: "For trying HelpDeskFlow end to end.",
    features: [
      "Core ticketing & customer portal",
      "Up to 2 agents",
      "100 tickets / month",
      "30-day retention",
    ],
  },
  {
    name: "Growth",
    price: "₹49",
    cadence: "per agent / month",
    tagline: "For small teams putting support on rails.",
    features: [
      "Everything in Free",
      "Automation rules",
      "SLA policies",
      "Live chat widget",
      "Up to 10 agents",
    ],
  },
  {
    name: "Business",
    price: "₹149",
    cadence: "per agent / month",
    tagline: "For growing, multi-team support operations.",
    popular: true,
    features: [
      "Everything in Growth",
      "Advanced routing & custom fields",
      "Multiple teams",
      "Advanced analytics",
      "Up to 50 agents",
    ],
  },
  {
    name: "Enterprise",
    price: "₹499",
    cadence: "per agent / month",
    tagline: "For governance, scale and bespoke needs.",
    features: [
      "Everything in Business",
      "SSO & audit controls",
      "Advanced retention",
      "Custom support",
      "Unlimited agents",
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="section ink" style={{ paddingBottom: 56 }}>
        <div className="container">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div className="ornament">
              <span className="diamond" />
            </div>
            <span className="eyebrow" style={{ color: "var(--gold-2)" }}>
              Pricing
            </span>
            <h2>Plans that scale with your team</h2>
            <p>
              Start free, then move to a plan that matches your team. Annual billing saves two
              months.
            </p>
          </div>
          <div className="pricing-hero-art reveal">
            <ArtReports />
          </div>
        </div>
      </section>

      <section className="section cream">
        <div className="container">
          <div className="grid cols-4">
            {plans.map((p, i) => (
              <div className={`plan-card reveal delay-${i + 1} ${p.popular ? "featured" : ""}`} key={p.name}>
                {p.popular && <span className="badge no-dot plan-badge">Most popular</span>}
                <div>
                  <h3 className="plan-name">{p.name}</h3>
                  <div className="plan-price">{p.price}</div>
                  {p.cadence && <p className="plan-tag">priced {p.cadence}</p>}
                  <p className="plan-tag" style={{ marginTop: p.cadence ? 8 : 0 }}>
                    {p.tagline}
                  </p>
                </div>
                <div className="divider" style={{ margin: 0 }} />
                <ul className="plan-list">
                  {p.features.map((f) => (
                    <li key={f}>
                      <span className="tick">
                        <Icon name="check" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "auto", paddingTop: 8 }}>
                  <Link href="/register" className={`btn block ${p.popular ? "gold" : "secondary"}`}>
                    Get started
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="muted" style={{ textAlign: "center", marginTop: 30, fontSize: 13.5 }}>
            Entitlements are enforced on the backend; plan limits are shown before users reach them.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-panel">
            <div>
              <h2>Not sure which plan fits?</h2>
              <p>Start your free trial and move up whenever your team is ready.</p>
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
