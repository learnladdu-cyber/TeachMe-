"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";

export type AttachmentRow = {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentsPanel({
  orgId,
  ticketId,
  attachments,
}: {
  orgId: string;
  ticketId: string;
  attachments: AttachmentRow[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("ticketId", ticketId);
    const res = await fetch(`/api/organizations/${orgId}/attachments`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json?.error?.message ?? "Upload failed.");
    } else if (inputRef.current) {
      inputRef.current.value = "";
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <h3 className="card-title">Attachments</h3>
      {attachments.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>
          No files attached.
        </p>
      ) : (
        <div className="mini-list" style={{ marginBottom: 12 }}>
          {attachments.map((a) => (
            <div className="mini-row" key={a.id}>
              <a href={`/api/attachments/${a.id}`} target="_blank" rel="noreferrer" className="mini-title">
                <Icon name="document" size={15} /> {a.filename}
              </a>
              <span className="cell-sub">{humanSize(a.size)}</span>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="alert error">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}
      <div className="row" style={{ gap: 8 }}>
        <input ref={inputRef} type="file" style={{ flex: 1, minWidth: 0 }} />
        <button className="btn secondary sm" type="button" onClick={upload} disabled={busy}>
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}
