"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function resend() {
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sentTo }),
    });
    setResent(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const fields = json?.error?.field_errors;
      const first = fields ? Object.values(fields)[0] : null;
      setError((first as string) ?? json?.error?.message ?? "Sign up failed.");
      setBusy(false);
      return;
    }
    if (json?.data?.requiresVerification) {
      setSentTo(json.data.email ?? form.email);
      setBusy(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  if (sentTo) {
    return (
      <div className="stack" style={{ gap: 14 }}>
        <div className="alert success">
          <Icon name="mail" />
          <span>Check your inbox — we sent a verification link to {sentTo}.</span>
        </div>
        <p className="muted" style={{ fontSize: 14 }}>
          Click the link in the email to activate your workspace. The link expires in 24 hours.
        </p>
        <button className="btn secondary" type="button" onClick={resend} disabled={resent}>
          {resent ? "Verification email sent" : "Resend verification email"}
        </button>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      {error && (
        <div className="alert error">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}
      <div className="field">
        <label htmlFor="organizationName">Organization name</label>
        <input
          id="organizationName"
          value={form.organizationName}
          onChange={update("organizationName")}
          placeholder="Acme Corp"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" value={form.name} onChange={update("name")} placeholder="Ada Lovelace" required />
      </div>
      <div className="field">
        <label htmlFor="email">Work email</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="you@company.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={form.password}
          onChange={update("password")}
          required
          minLength={10}
          autoComplete="new-password"
          placeholder="At least 10 characters"
        />
      </div>
      <button className="btn block" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create organization"}
        {!busy && <Icon name="arrow-right" />}
      </button>
    </form>
  );
}
