"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export function NewTicketForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "NORMAL",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/organizations/${orgId}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error?.message ?? "Could not create ticket.");
      setBusy(false);
      return;
    }
    router.push(`/portal/tickets/${json.data.id}`);
    router.refresh();
  }

  return (
    <form className="form" onSubmit={submit} style={{ maxWidth: 640 }}>
      {error && (
        <div className="alert error">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}

      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          required
          maxLength={200}
          placeholder="A short summary of the problem"
        />
      </div>

      <div className="field">
        <label htmlFor="description">How can we help?</label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
          placeholder="Include what you expected and what happened, plus any steps to reproduce."
          style={{ minHeight: 170 }}
        />
        <div className="hint">{form.description.length} characters</div>
      </div>

      <div className="field">
        <label htmlFor="priority">Priority</label>
        <select
          id="priority"
          value={form.priority}
          onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <div className="hint">
          Choose Urgent only for outages or security issues so we route it correctly.
        </div>
      </div>

      <div className="row">
        <button className="btn" type="submit" disabled={busy}>
          <Icon name="send" />
          {busy ? "Submitting…" : "Submit ticket"}
        </button>
      </div>
    </form>
  );
}
