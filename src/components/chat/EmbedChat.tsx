"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "VISITOR" | "BOT" | "AGENT";
  body: string;
  articleTitle: string | null;
  createdAt: string;
};

type ChatConfig = {
  key: string;
  organizationName: string;
  welcome: string;
  accent: string;
  launcherLabel?: string;
  position?: "left" | "right";
  preview?: boolean;
};

const VISITOR_KEY = "hdf_chat_visitor";

function getVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
    const fresh = `v${crypto.randomUUID().replace(/-/g, "")}`;
    window.localStorage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    return `v${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

export function EmbedChat({ config }: { config: ChatConfig }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"connecting" | "ready" | "error">("connecting");
  const [sending, setSending] = useState(false);
  const [handoff, setHandoff] = useState(false);

  const visitorIdRef = useRef<string>("");
  const conversationIdRef = useRef<string>("");
  const seenRef = useRef<Set<string>>(new Set());
  const streamRef = useRef<EventSource | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

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
    const visitorId = getVisitorId();
    visitorIdRef.current = visitorId;
    let cancelled = false;

    async function start() {
      try {
        const res = await fetch(`/api/chat/${config.key}/conversations`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ visitorId, pageUrl: document.referrer || location.href }),
        });
        if (!res.ok) throw new Error("failed to start");
        const json = (await res.json()) as {
          data: { conversationId: string; messages: ChatMessage[] };
        };
        if (cancelled) return;
        conversationIdRef.current = json.data.conversationId;
        const incoming = json.data.messages;
        if (config.preview) {
          const idx = incoming.findIndex((m) => m.role === "BOT");
          if (idx >= 0) incoming[idx] = { ...incoming[idx], body: config.welcome };
          else
            incoming.unshift({
              id: "welcome-preview",
              role: "BOT",
              body: config.welcome,
              articleTitle: null,
              createdAt: new Date().toISOString(),
            });
        }
        appendMessages(incoming);
        setStatus("ready");
        openStream(json.data.conversationId);
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    function openStream(conversationId: string) {
      const url = `/api/chat/${config.key}/conversations/${conversationId}/stream?visitorId=${encodeURIComponent(visitorId)}`;
      const source = new EventSource(url);
      source.addEventListener("message", (event) => {
        try {
          appendMessages([JSON.parse((event as MessageEvent).data) as ChatMessage]);
        } catch {
          // ignore malformed frame
        }
      });
      source.onerror = () => {
        // EventSource auto-reconnects; nothing to do.
      };
      streamRef.current = source;
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.close();
      streamRef.current = null;
    };
  }, [appendMessages, config.key]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [messages]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const body = input.trim();
    if (!body || sending || !conversationIdRef.current) return;
    setInput("");
    setSending(true);
    try {
      const res = await fetch(
        `/api/chat/${config.key}/conversations/${conversationIdRef.current}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ visitorId: visitorIdRef.current, body }),
        },
      );
      if (res.ok) {
        const json = (await res.json()) as { data: { messages: ChatMessage[] } };
        appendMessages(json.data.messages);
      }
    } catch {
      // keep the UI responsive; the stream may still deliver the message
    } finally {
      setSending(false);
    }
  }

  async function requestHuman() {
    if (!conversationIdRef.current || handoff) return;
    setHandoff(true);
    try {
      const res = await fetch(
        `/api/chat/${config.key}/conversations/${conversationIdRef.current}/handoff`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ visitorId: visitorIdRef.current }),
        },
      );
      if (res.ok) {
        const json = (await res.json()) as { data: { message: ChatMessage } };
        appendMessages([json.data.message]);
      }
    } catch {
      setHandoff(false);
    }
  }

  return (
    <div className="embed-chat" style={{ "--chat-accent": config.accent } as React.CSSProperties}>
      <header className="embed-chat__head">
        <span className="embed-chat__dot" aria-hidden="true" />
        <div>
          <p className="embed-chat__title">{config.organizationName}</p>
          <p className="embed-chat__sub">Support assistant</p>
        </div>
      </header>

      <div className="embed-chat__body" ref={scrollerRef}>
        {status === "connecting" && <p className="embed-chat__hint">Connecting…</p>}
        {status === "error" && (
          <p className="embed-chat__hint">Chat is unavailable right now. Please try again.</p>
        )}
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

      <form className="embed-chat__form" onSubmit={sendMessage}>
        <input
          className="embed-chat__input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type your question…"
          maxLength={4000}
          aria-label="Message"
          disabled={status !== "ready"}
        />
        <button
          className="embed-chat__send"
          type="submit"
          disabled={sending || status !== "ready" || input.trim().length === 0}
        >
          Send
        </button>
      </form>

      <button
        className="embed-chat__handoff"
        type="button"
        onClick={requestHuman}
        disabled={handoff || status !== "ready"}
      >
        {handoff ? "A teammate has been notified" : "Talk to a human"}
      </button>
    </div>
  );
}
