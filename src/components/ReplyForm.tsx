"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

export function ReplyForm({
  orgId,
  ticketId,
  allowInternal = false,
}: {
  orgId: string;
  ticketId: string;
  allowInternal?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "INTERNAL">("PUBLIC");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/organizations/${orgId}/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, visibility }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json?.error?.message ?? "Could not send message.");
      setBusy(false);
      return;
    }
    setBody("");
    setVisibility("PUBLIC");
    setBusy(false);
    router.refresh();
  }

  const internal = visibility === "INTERNAL";

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: 18 }}>
      {error && (
        <div className="alert error">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}

      {allowInternal && (
        <div className="row" style={{ marginBottom: 12, gap: 6 }}>
          <button
            type="button"
            className={`chip${!internal ? " active" : ""}`}
            onClick={() => setVisibility("PUBLIC")}
          >
            <Icon name="chat" size={14} /> Public reply
          </button>
          <button
            type="button"
            className={`chip${internal ? " active" : ""}`}
            onClick={() => setVisibility("INTERNAL")}
          >
            <Icon name="lock" size={14} /> Internal note
          </button>
        </div>
      )}

      <textarea
        id={`reply-${ticketId}`}
        aria-label={internal ? "Internal note" : "Reply"}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={internal ? "Add a note only your team can see…" : "Type your message…"}
        style={internal ? { background: "#fffbeb", borderColor: "#fde68a" } : undefined}
      />

      <div className="row between" style={{ marginTop: 12 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>
          {internal ? "Customers will not see this note." : "This reply is visible to the customer."}
        </span>
        <button className="btn" type="submit" disabled={busy || !body.trim()}>
          <Icon name="send" />
          {busy ? "Sending…" : internal ? "Add note" : "Send reply"}
        </button>
      </div>
    </form>
  );
}
