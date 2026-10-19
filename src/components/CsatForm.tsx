"use client";

import { useState } from "react";
import { submitCsatAction } from "@/app/(portal)/portal/tickets/[id]/actions";

export function CsatForm({ ticketId }: { ticketId: string }) {
  const [score, setScore] = useState(0);

  return (
    <form action={submitCsatAction} className="card">
      <h3 className="card-title">How did we do?</h3>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="score" value={score} />
      <div className="row" style={{ gap: 6, marginBottom: 12 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`star${score >= n ? " active" : ""}`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setScore(n)}
          >
            ★
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="csat-comment">Anything else? (optional)</label>
        <textarea id="csat-comment" name="comment" rows={2} />
      </div>
      <button className="btn gold" type="submit" disabled={score === 0}>
        Send feedback
      </button>
    </form>
  );
}
