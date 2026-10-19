import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ArtChat } from "@/components/illustrations";

const points = [
  "Server-side tenant isolation on every request",
  "Agents, teams, customers and platform admins",
  "Ticket lifecycle with a guarded transition map",
  "Internal notes never exposed to customers",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-panel">
        <Link href="/" className="logo">
          <span className="logo-mark">
            <Icon name="headset" />
          </span>
          <span>HelpDeskFlow</span>
        </Link>

        <div>
          <p className="auth-quote">
            One workspace to receive, answer and <span className="gold">measure every request.</span>
          </p>
          <div className="auth-points">
            {points.map((p) => (
              <div className="auth-point" key={p}>
                <span className="tick">
                  <Icon name="check" />
                </span>
                {p}
              </div>
            ))}
          </div>
          <div className="auth-art">
            <ArtChat />
          </div>
        </div>

        <p style={{ color: "#8f9bc0", fontSize: 13, margin: 0 }}>
          Secure by design — encrypted credentials and server-side isolation.
        </p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
