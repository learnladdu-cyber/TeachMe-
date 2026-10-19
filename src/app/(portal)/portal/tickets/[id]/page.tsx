import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveContext } from "@/lib/auth";
import { getTicketForUser } from "@/lib/tickets";
import { ApiError } from "@/lib/api";
import { isUuid } from "@/lib/security/sanitize";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { TicketTimeline } from "@/components/TicketTimeline";
import { ReplyForm } from "@/components/ReplyForm";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
import { CsatForm } from "@/components/CsatForm";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PortalTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ csat?: string }>;
}) {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();

  let ticket;
  try {
    ticket = await getTicketForUser(ctx.organizationId, ctx.session.user.id, ctx.role, id);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }

  const csat = await prisma.csatResponse.findUnique({ where: { ticketId: ticket.id } });
  const canRate =
    ticket.requesterId === ctx.session.user.id &&
    (ticket.status === "RESOLVED" || ticket.status === "CLOSED") &&
    !csat;

  const isStaff = ctx.role !== "CUSTOMER" && ctx.role !== "PLATFORM_ADMIN";

  return (
    <>
      <p style={{ margin: "0 0 14px" }}>
        <Link href={isStaff ? "/app" : "/portal"} className="row" style={{ display: "inline-flex", gap: 6, fontSize: 13.5 }}>
          <Icon name="arrow-right" style={{ transform: "rotate(180deg)" }} size={15} /> Back
        </Link>
      </p>

      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <h1>{ticket.subject}</h1>
          <p className="page-sub">
            <span className="code">{ticket.publicId}</span> · opened{" "}
            {new Date(ticket.createdAt).toLocaleString()}
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
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <strong style={{ fontSize: 14 }}>Conversation</strong>
            </div>
            <div style={{ padding: 20 }}>
              <TicketTimeline messages={ticket.messages} />
            </div>
          </div>

          <ReplyForm orgId={ctx.organizationId} ticketId={ticket.id} />

          {sp.csat === "thanks" && (
            <div className="alert success">
              <Icon name="check" />
              <span>Thanks for your feedback!</span>
            </div>
          )}

          {csat && (
            <div className="card">
              <h3 className="card-title">Your rating</h3>
              <div className="row" style={{ gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`star${csat.score >= n ? " active" : ""}`}>
                    ★
                  </span>
                ))}
              </div>
              {csat.comment && <p className="muted" style={{ fontSize: 13 }}>{csat.comment}</p>}
            </div>
          )}

          {canRate && <CsatForm ticketId={ticket.id} />}
        </div>

        <div className="card">
          <h3 className="card-title">Details</h3>
          <div className="stack">
            <div className="row" style={{ gap: 10 }}>
              <Avatar name={ticket.requester.name} />
              <div>
                <div className="cell-sub">Requester</div>
                <strong style={{ fontSize: 13.5 }}>{ticket.requester.name}</strong>
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              {ticket.assignee ? (
                <Avatar name={ticket.assignee.name} />
              ) : (
                <span className="avatar" style={{ background: "#e2e8f0" }}>
                  ?
                </span>
              )}
              <div>
                <div className="cell-sub">Assignee</div>
                <strong style={{ fontSize: 13.5 }}>{ticket.assignee?.name ?? "Unassigned"}</strong>
              </div>
            </div>
            <div className="divider" style={{ margin: "4px 0" }} />
            <div className="row between">
              <span className="cell-sub">Status</span>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="row between">
              <span className="cell-sub">Priority</span>
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
