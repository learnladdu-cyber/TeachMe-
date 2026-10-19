import Link from "next/link";
import { verifyEmailToken } from "@/lib/email/verify";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let state: "missing" | "ok" | "invalid" | "expired" = "missing";
  let email = "";

  if (token) {
    const result = await verifyEmailToken(token);
    if (result.ok) {
      state = "ok";
      email = result.email;
    } else {
      state = result.reason;
    }
  }

  if (state === "ok") {
    return (
      <>
        <h1>Email verified</h1>
        <p className="sub">Thanks — {email} is confirmed and your workspace is ready.</p>
        <div className="alert success">
          <Icon name="check" />
          <span>Your email address has been verified.</span>
        </div>
        <Link href="/app" className="btn block" style={{ marginTop: 18 }}>
          Continue to workspace <Icon name="arrow-right" />
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>Verify your email</h1>
      <p className="sub">
        {state === "missing"
          ? "Open the verification link from your inbox to activate your account."
          : state === "expired"
            ? "That verification link has expired. Sign in to request a new one."
            : "That verification link is invalid. Sign in to request a new one."}
      </p>
      <div className="alert error">
        <Icon name="alert" />
        <span>
          {state === "missing"
            ? "No verification token provided."
            : state === "expired"
              ? "This link is no longer valid."
              : "We couldn't verify this link."}
        </span>
      </div>
      <Link href="/login" className="btn block" style={{ marginTop: 18 }}>
        Go to sign in <Icon name="arrow-right" />
      </Link>
    </>
  );
}
