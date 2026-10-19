"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "VISITOR" | "BOT" | "AGENT";
  body: string;
  articleTitle: string | null;
  createdAt: string;
};

type Conversation = {
  id: string;
  visitorName: string | null;
  visitorEmail: string | null;
  pageUrl: string | null;
  status: "OPEN" | "CLOSED";
  unreadForStaff: number;
  lastMessageAt: string;
  createdAt: string;
  preview: string | null;
  messageCount: number;
};

function time(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function display(conversation: Conversation): string {
  return conversation.visitorName || conversation.visitorEmail || "Anonymous visitor";
}

export function ChatConsole({ organizationId }: { organizationId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  const seenRef = useRef<Set<string>>(new Set());
  const threadStreamRef = useRef<EventSource | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/chat`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data: Conversation[] };
      setConversations(json.data);
    } catch {
      // transient
    }
  }, [organizationId]);

  useEffect(() => {
    loadConversations();
    const source = new EventSource(`/api/organizations/${organizationId}/chat/stream`);
    source.addEventListener("conversation", () => loadConversations());
    const interval = setInterval(loadConversations, 20_000);
    return () => {
      source.close();
      clearInterval(interval);
    };
  }, [loadConversations, organizationId]);

  const appendMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const next = [...prev];
      for (const message of incoming) {
        if (seenRef.current.has(message.id)) continue;
        seenRef.current.add(message.id);
        next.push(message);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    seenRef.current = new Set();
    setMessages([]);
    setLoadingThread(true);

    let cancelled = false;

    async function loadThread() {
      try {
        const res = await fetch(
          `/api/organizations/${organizationId}/chat/${activeId}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { data: { messages: ChatMessage[] } };
        if (cancelled) return;
        appendMessages(json.data.messages);
        loadConversations();
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    }

    loadThread();

    const source = new EventSource(
      `/api/organizations/${organizationId}/chat/${activeId}/stream`,
    );
    source.addEventListener("message", (event) => {
      try {
        appendMessages([JSON.parse((event as MessageEvent).data) as ChatMessage]);
      } catch {
        // ignore malformed frame
      }
    });
    threadStreamRef.current = source;

    return () => {
      cancelled = true;
      source.close();
      threadStreamRef.current = null;
    };
  }, [activeId, appendMessages, loadConversations, organizationId]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [messages]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = input.trim();
    if (!body || !activeId || sending) return;
    setInput("");
    setSending(true);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/chat/${activeId}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      if (res.ok) {
        const json = (await res.json()) as { data: { message: ChatMessage } };
        appendMessages([json.data.message]);
        loadConversations();
      }
    } catch {
      // transient
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus(conversation: Conversation) {
    const status = conversation.status === "OPEN" ? "CLOSED" : "OPEN";
    await fetch(`/api/organizations/${organizationId}/chat/${conversation.id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadConversations();
  }

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadForStaff, 0);

  return (
    <div className="chat-console">
      <div className="chat-list">
        <div className="chat-list__head">
          <span>Conversations</span>
          {totalUnread > 0 && <span className="chat-badge">{totalUnread}</span>}
        </div>
        <div className="chat-list__body">
          {conversations.length === 0 && (
            <p className="chat-list__empty">
              No conversations yet. Install the widget to start chatting with visitors.
            </p>
          )}
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={`chat-list__item${conversation.id === activeId ? " on" : ""}`}
              onClick={() => setActiveId(conversation.id)}
            >
              <div className="chat-list__row">
                <strong>{display(conversation)}</strong>
                <span className="muted">{time(conversation.lastMessageAt)}</span>
              </div>
              <div className="chat-list__row">
                <span className="chat-list__preview">{conversation.preview ?? "—"}</span>
                {conversation.unreadForStaff > 0 && (
                  <span className="chat-badge">{conversation.unreadForStaff}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="chat-thread">
        {!active ? (
          <div className="chat-thread__empty">Select a conversation to view the transcript.</div>
        ) : (
          <>
            <header className="chat-thread__head">
              <div>
                <strong>{display(active)}</strong>
                <div className="cell-sub">
                  {active.visitorEmail ?? "No email"} · {active.pageUrl ?? "unknown page"}
                </div>
              </div>
              <button
                type="button"
                className="btn secondary"
                onClick={() => toggleStatus(active)}
              >
                {active.status === "OPEN" ? "Close" : "Reopen"}
              </button>
            </header>

            <div className="chat-thread__body" ref={scrollerRef}>
              {loadingThread && <p className="chat-thread__empty">Loading…</p>}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`embed-msg embed-msg--${message.role.toLowerCase()}`}
                >
                  <div className="embed-msg__bubble">{message.body}</div>
                  {message.articleTitle && (
                    <p className="embed-msg__source">From: {message.articleTitle}</p>
                  )}
                </div>
              ))}
            </div>

            <form className="chat-thread__form" onSubmit={send}>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Reply to the visitor…"
                maxLength={4000}
                aria-label="Reply"
              />
              <button className="btn" type="submit" disabled={sending || input.trim().length === 0}>
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
