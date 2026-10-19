"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

type Staff = { id: string; name: string; email: string; role: string };

const STATUSES = ["NEW", "OPEN", "PENDING", "ON_HOLD", "RESOLVED", "CLOSED"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export function TicketControls({
  orgId,
  ticketId,
  status,
  priority,
  assigneeId,
  staff,
}: {
  orgId: string;
  ticketId: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  staff: Staff[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/organizations/${orgId}/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json?.error?.message ?? "Update failed.");
    } else {
      router.refresh();
    }
    setBusy(false);
  }

  const closed = status === "RESOLVED" || status === "CLOSED";

  return (
    <div className="card">
      <h3 className="card-title">Ticket controls</h3>
      {error && (
        <div className="alert error">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}

      <div className="stack">
        <div className="field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            disabled={busy}
            onChange={(e) => patch({ status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={priority}
            disabled={busy}
            onChange={(e) => patch({ priority: e.target.value })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="assignee">Assignee</label>
          <select
            id="assignee"
            value={assigneeId ?? ""}
            disabled={busy}
            onChange={(e) => patch({ assigneeId: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.role.replace("_", " ").toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="divider" style={{ margin: "4px 0" }} />

        {closed ? (
          <button className="btn secondary block" disabled={busy} onClick={() => patch({ status: "OPEN" })}>
            <Icon name="clock" /> Reopen ticket
          </button>
        ) : (
          <button className="btn block" disabled={busy} onClick={() => patch({ status: "RESOLVED" })}>
            <Icon name="check" /> Mark resolved
          </button>
        )}
      </div>
    </div>
  );
}
