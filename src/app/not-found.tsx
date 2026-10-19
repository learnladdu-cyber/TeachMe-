import Link from "next/link";
import { ArtEmpty } from "@/components/illustrations";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(180deg, var(--cream), #f3ede1)",
      }}
    >
      <div className="card" style={{ maxWidth: 440, textAlign: "center", padding: 40 }}>
        <ArtEmpty style={{ width: 180, margin: "0 auto 8px" }} />
        <div
          className="display"
          style={{
            fontSize: 52,
            fontWeight: 700,
            background: "var(--gold-grad)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          404
        </div>
        <h1 className="display" style={{ margin: "6px 0 8px", fontSize: 22 }}>
          Page not found
        </h1>
        <p className="muted" style={{ marginTop: 0 }}>
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
          <Link href="/" className="btn gold">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
