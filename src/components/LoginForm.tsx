"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);
  const [totp, setTotp] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);

  async function resend() {
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResent(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUnverified(false);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, totp: totp || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (json?.error?.code === "email_unverified") setUnverified(true);
      if (json?.error?.code === "totp_required" || json?.error?.code === "invalid_totp") {
        setNeedsTotp(true);
      }
      setError(json?.error?.message ?? "Sign in failed.");
      setBusy(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={submit}>
      {error && (
        <div className="alert error">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}
      {unverified && (
        <button className="btn secondary block" type="button" onClick={resend} disabled={resent}>
          {resent ? "Verification email sent" : "Resend verification email"}
        </button>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@company.com"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>
      {needsTotp && (
        <div className="field">
          <label htmlFor="totp">Two-factor code</label>
          <input
            id="totp"
            inputMode="numeric"
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
            autoComplete="one-time-code"
            placeholder="6-digit code or backup code"
          />
        </div>
      )}
      <button className="btn block" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
        {!busy && <Icon name="arrow-right" />}
      </button>
    </form>
  );
}
