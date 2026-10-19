import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Icon } from "@/components/Icon";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollProgress />
      <MarketingNav />
      {children}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link href="/" className="logo">
                <span className="logo-mark">
                  <Icon name="headset" />
                </span>
                <span>HelpDeskFlow</span>
              </Link>
              <p style={{ marginTop: 16, maxWidth: 320, color: "#8d87a4", fontSize: 14 }}>
                A multi-tenant support platform — organized from the first hello to the final
                report.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <div className="footer-links">
                <Link href="/features">Features</Link>
                <Link href="/pricing">Pricing</Link>
                <Link href="/register">Get started</Link>
              </div>
            </div>
            <div>
              <h4>Account</h4>
              <div className="footer-links">
                <Link href="/login">Sign in</Link>
                <Link href="/register">Create account</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} HelpDeskFlow. All rights reserved.</span>
            <span>Made for support teams that care about craft.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
