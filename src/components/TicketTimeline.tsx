import { Avatar } from "@/components/Avatar";

type Message = {
  id: string;
  visibility: string;
  body: string;
  createdAt: Date | string;
  author: { name: string; email: string };
};

function when(value: Date | string): string {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TicketTimeline({ messages }: { messages: Message[] }) {
  return (
    <div className="timeline">
      {messages.map((m) => (
        <div key={m.id} className={`msg${m.visibility === "INTERNAL" ? " internal" : ""}`}>
          <Avatar name={m.author.name} />
          <div className="msg-main">
            <div className="msg-head">
              <span className="msg-author">{m.author.name}</span>
              <span className="msg-time">{when(m.createdAt)}</span>
            </div>
            <div className="bubble">{m.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
