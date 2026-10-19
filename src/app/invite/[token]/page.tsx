import Link from "next/link";
import { getSession } from "@/lib/session";
import { getInviteByToken } from "@/lib/invites";
import { Icon } from "@/components/Icon";
import { acceptInviteAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const [invite, session] = await Promise.all([getInviteByToken(token), getSession()]);

  return (
    <main className="auth-main" style={{ minHeight: "100vh" }}>
      <div className="auth-card card">
        <div className="logo">
          <span className="logo-mark">
            <Icon name="headset" />
          </span>
          <span>HelpDeskFlow</span>
        </div>

        {!invite ? (
          <>
            <h1>Invitation unavailable</h1>
            <p className="muted">
              This invitation is invalid, has already been used, or has expired. Ask an admin to send a
              new one.
            </p>
            <Link className="btn secondary block" href="/login">
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <h1>Join {invite.organization.name}</h1>
            <p className="muted">
              You&apos;ve been invited as <strong>{invite.role.toLowerCase().replace("_", " ")}</strong>{" "}
              for <span className="code">{invite.email}</span>.
            </p>

            {sp.error === "email_mismatch" && (
              <div className="alert error">
                <Icon name="alert" />
                <span>You&apos;re signed in with a different email. Sign in as {invite.email} to accept.</span>
              </div>
            )}

            {!session ? (
              <>
                <div className="alert">
                  <Icon name="alert" />
                  <span>Sign in or create an account with {invite.email}, then reopen this link.</span>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <Link className="btn block" href="/login">
                    Sign in
                  </Link>
                  <Link className="btn secondary block" href="/register">
                    Create account
                  </Link>
                </div>
              </>
            ) : (
              <form action={acceptInviteAction}>
                <input type="hidden" name="token" value={token} />
                <button className="btn gold block" type="submit">
                  <Icon name="check" /> Accept invitation
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
