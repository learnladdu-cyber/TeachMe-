import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveContext } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { getTicketForUser } from "@/lib/tickets";
import { listStaff } from "@/lib/orgs";
import { ApiError } from "@/lib/api";
import { isUuid } from "@/lib/security/sanitize";
import { StatusBadge, PriorityBadge, TagBadge } from "@/components/Badges";
import { TicketTimeline } from "@/components/TicketTimeline";
import { ReplyForm } from "@/components/ReplyForm";
import { TicketControls } from "@/components/TicketControls";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { listTicketAttachments } from "@/lib/attachments";

export const dynamic = "force-dynamic";

function eventLabel(type: string): string {
  const t = type.split(".").join(" ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default async function WorkspaceTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getActiveContext();
  if (!ctx) {
    const session = await getSession();
    redirect(session?.user.isPlatformAdmin ? "/admin" : "/login");
  }
  if (ctx.role === "CUSTOMER") redirect("/portal");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  let ticket;
  try {
    ticket = await getTicketForUser(ctx.organizationId, ctx.session.user.id, ctx.role, id);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
  const staff = await listStaff(ctx.organizationId);
  const attachments = await listTicketAttachments(ctx.organizationId, ticket.id);
  const slaBreached = Boolean(ticket.slaBreachedAt);

  return (
    <>
      <p style={{ margin: "0 0 14px" }}>
        <Link href="/app" className="row" style={{ display: "inline-flex", gap: 6, fontSize: 13.5 }}>
          <Icon name="arrow-right" style={{ transform: "rotate(180deg)" }} size={15} /> Back to inbox
        </Link>
      </p>

      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <h1>{ticket.subject}</h1>
          <p className="page-sub">
            <span className="code">{ticket.publicId}</span> · channel {ticket.channel.toLowerCase()} ·
            opened {new Date(ticket.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="page-actions">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", alignItems: "start" }}>
        <div>
          <div className="card flush">
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <strong style={{ fontSize: 14 }}>Conversation</strong>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {ticket.messages.length} message{ticket.messages.length === 1 ? "" : "s"}
              </span>
            </div>
            <div style={{ padding: 20 }}>
              <TicketTimeline messages={ticket.messages} />
            </div>
          </div>

          <ReplyForm orgId={ctx.organizationId} ticketId={ticket.id} allowInternal />

          <AttachmentsPanel
            orgId={ctx.organizationId}
            ticketId={ticket.id}
            attachments={attachments.map((a) => ({
              id: a.id,
              filename: a.filename,
              size: a.size,
              createdAt: a.createdAt.toISOString(),
            }))}
          />
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <TicketControls
            orgId={ctx.organizationId}
            ticketId={ticket.id}
            status={ticket.status}
            priority={ticket.priority}
            assigneeId={ticket.assigneeId}
            staff={staff}
          />

          <div className="card">
            <div className="card-head">
              <h3 className="card-title" style={{ margin: 0 }}>
                SLA
              </h3>
              <span className={`badge ${slaBreached ? "status-URGENT" : "status-RESOLVED"}`}>
                {slaBreached ? "breached" : "on track"}
              </span>
            </div>
            <div className="meta-list">
              <div className="meta-item">
                <span className="k">First response due</span>
                <span className="v">
                  {ticket.firstResponseDueAt
                    ? new Date(ticket.firstResponseDueAt).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="meta-item">
                <span className="k">First response</span>
                <span className="v">
                  {ticket.firstResponseAt ? new Date(ticket.firstResponseAt).toLocaleString() : "pending"}
                </span>
              </div>
              <div className="meta-item">
                <span className="k">Resolution due</span>
                <span className="v">{ticket.dueAt ? new Date(ticket.dueAt).toLocaleString() : "—"}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Requester</h3>
            <div className="row" style={{ gap: 10 }}>
              <Avatar name={ticket.requester.name} size="lg" />
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{ticket.requester.name}</strong>
                <div className="code">{ticket.requester.email}</div>
              </div>
            </div>
            {ticket.tags.length > 0 && (
              <>
                <div className="divider" />
                <div className="cell-sub" style={{ marginBottom: 8 }}>
                  Tags
                </div>
                <div className="row">
                  {ticket.tags.map((t) => (
                    <TagBadge key={t.tag.id} name={t.tag.name} />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Activity</h3>
            <div className="audit-list">
              {ticket.events.map((e) => (
                <div className="audit-item" key={e.id}>
                  <span className="audit-dot" />
                  <div>
                    <div>{eventLabel(e.eventType)}</div>
                    <div className="t">{new Date(e.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
