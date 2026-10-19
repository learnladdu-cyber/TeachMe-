import { Prisma, TicketStatus, MessageVisibility, type Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { forbidden, notFound } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { runAutomations } from "@/lib/automation-engine";
import { applySlaToTicket, markFirstResponse } from "@/lib/sla";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { notify } from "@/lib/notifications";
import { assertCanCreateTicket } from "@/lib/usage";
import {
  csatEmail,
  ticketAssignedEmail,
  ticketCreatedEmail,
  ticketRepliedEmail,
  ticketResolvedEmail,
} from "@/lib/email/ticket-templates";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function ticketUrl(organizationId: string, ticketId: string, staff: boolean): string {
  void organizationId;
  return `${APP_URL}${staff ? "/app" : "/portal"}/tickets/${ticketId}`;
}

async function orgName(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  return org?.name ?? "HelpDeskFlow";
}

// Server-side ticket status transition map.
export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "PENDING", "ON_HOLD", "RESOLVED", "CLOSED"],
  OPEN: ["PENDING", "ON_HOLD", "RESOLVED", "CLOSED"],
  PENDING: ["OPEN", "ON_HOLD", "RESOLVED", "CLOSED"],
  ON_HOLD: ["OPEN", "PENDING", "RESOLVED", "CLOSED"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

const CLOSED_LIKE: TicketStatus[] = ["RESOLVED", "CLOSED"];

export type CreateTicketInput = {
  subject: string;
  description: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  channel?: "PORTAL" | "EMAIL" | "CHAT";
};

export async function createTicket(
  organizationId: string,
  requesterId: string,
  input: CreateTicketInput,
) {
  await assertCanCreateTicket(organizationId);

  const ticket = await prisma.$transaction(async (tx) => {
    const last = await tx.ticket.findFirst({
      where: { organizationId },
      orderBy: { publicId: "desc" },
      select: { publicId: true },
    });
    const n = last ? Number.parseInt(last.publicId.replace(/\D/g, ""), 10) : 1000;
    const publicId = `TCK-${(Number.isFinite(n) ? n : 1000) + 1}`;

    const created = await tx.ticket.create({
      data: {
        organizationId,
        publicId,
        requesterId,
        subject: input.subject,
        description: input.description,
        priority: input.priority ?? "NORMAL",
        channel: input.channel ?? "PORTAL",
        status: "NEW",
      },
    });

    await tx.message.create({
      data: {
        organizationId,
        ticketId: created.id,
        authorId: requesterId,
        visibility: "PUBLIC",
        body: input.description,
        channel: input.channel ?? "PORTAL",
      },
    });

    await tx.ticketEvent.create({
      data: {
        organizationId,
        ticketId: created.id,
        actorId: requesterId,
        eventType: "ticket.created",
        afterJson: { status: "NEW", priority: created.priority },
      },
    });

    return created;
  });

  await applySlaToTicket(organizationId, ticket.id);
  await runAutomations(organizationId, ticket.id, "ticket.created").catch(() => {});

  const [requester, name] = await Promise.all([
    prisma.user.findUnique({ where: { id: requesterId }, select: { email: true, name: true } }),
    orgName(organizationId),
  ]);
  if (requester) {
    await notify({
      userId: requesterId,
      organizationId,
      type: "TICKET_CREATED",
      title: `We received ${ticket.publicId}`,
      body: ticket.subject,
      link: `/portal/tickets/${ticket.id}`,
      email: {
        to: requester.email,
        template: "ticket_created",
        ...ticketCreatedEmail({
          orgName: name,
          ticketRef: ticket.publicId,
          subject: ticket.subject,
          snippet: input.description.slice(0, 280),
          url: ticketUrl(organizationId, ticket.id, false),
        }),
      },
    }).catch(() => {});
  }
  await emitEvent(organizationId, "ticket.created", {
    ticketId: ticket.id,
    publicId: ticket.publicId,
    subject: ticket.subject,
    priority: ticket.priority,
    status: ticket.status,
  }).catch(() => {});

  return ticket;
}

function messageVisibilityFilter(role: Role): Prisma.MessageWhereInput {
  return isStaff(role) ? {} : { visibility: "PUBLIC" };
}

export async function listTickets(
  organizationId: string,
  userId: string,
  role: Role,
  filters: { status?: TicketStatus; q?: string; assignedToMe?: boolean } = {},
) {
  const where: Prisma.TicketWhereInput = { organizationId };
  if (!isStaff(role)) where.requesterId = userId;
  if (filters.assignedToMe) where.assigneeId = userId;
  if (filters.status) where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { subject: { contains: filters.q, mode: "insensitive" } },
      { publicId: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return prisma.ticket.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
  });
}

export async function getTicketForUser(
  organizationId: string,
  userId: string,
  role: Role,
  ticketId: string,
) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
      messages: {
        where: messageVisibilityFilter(role),
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true, isPlatformAdmin: true } } },
      },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) throw notFound();
  if (!isStaff(role) && ticket.requesterId !== userId) throw forbidden();
  return ticket;
}

export async function addMessage(
  organizationId: string,
  userId: string,
  role: Role,
  ticketId: string,
  body: string,
  visibility: MessageVisibility,
) {
  if (visibility === "INTERNAL" && !isStaff(role)) throw forbidden();

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId },
    select: { id: true, requesterId: true, status: true },
  });
  if (!ticket) throw notFound();
  if (!isStaff(role) && ticket.requesterId !== userId) throw forbidden();

  const message = await prisma.message.create({
    data: { organizationId, ticketId, authorId: userId, visibility, body, channel: "PORTAL" },
  });

  // Customer public replies on PENDING/RESOLVED move the ticket back to OPEN.
  const updates: Prisma.TicketUpdateInput = { updatedAt: new Date() };
  let newStatus: TicketStatus | undefined;
  if (!isStaff(role) && visibility === "PUBLIC" && (ticket.status === "PENDING" || ticket.status === "RESOLVED")) {
    newStatus = "OPEN";
    updates.status = "OPEN";
    updates.resolvedAt = null;
  } else {
    updates.updatedAt = new Date();
  }
  await prisma.ticket.update({ where: { id: ticketId }, data: updates });

  await prisma.ticketEvent.create({
    data: {
      organizationId,
      ticketId,
      actorId: userId,
      eventType: visibility === "INTERNAL" ? "message.internal" : "message.public",
      afterJson: newStatus ? { status: newStatus } : undefined,
    },
  });

  const staffReply = isStaff(role) && visibility === "PUBLIC";

  if (staffReply) {
    await markFirstResponse(ticketId);
  }

  if (visibility === "PUBLIC") {
    const full = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        publicId: true,
        subject: true,
        requesterId: true,
        assigneeId: true,
        requester: { select: { email: true, name: true } },
      },
    });
    if (full) {
      const name = await orgName(organizationId);

      if (staffReply) {
        await notify({
          userId: full.requesterId,
          organizationId,
          type: "TICKET_REPLIED",
          title: `New reply on ${full.publicId}`,
          body: full.subject,
          link: `/portal/tickets/${ticketId}`,
          dedupeKey: `reply:${message.id}`,
          email: {
            to: full.requester.email,
            template: "ticket_replied",
            ...ticketRepliedEmail({
              orgName: name,
              ticketRef: full.publicId,
              subject: full.subject,
              actorName: full.requester.name,
              snippet: body.slice(0, 280),
              url: ticketUrl(organizationId, ticketId, false),
            }),
          },
        }).catch(() => {});
      } else {
        const targets = await prisma.membership.findMany({
          where: {
            organizationId,
            status: "ACTIVE",
            role: { in: ["TEAM_LEAD", "ORG_ADMIN"] },
          },
          select: { userId: true, user: { select: { email: true } } },
        });
        const assignee = full.assigneeId
          ? await prisma.user.findUnique({
              where: { id: full.assigneeId },
              select: { id: true, email: true },
            })
          : null;
        const recipients = new Map(targets.map((t) => [t.userId, t.user.email]));
        if (assignee) recipients.set(assignee.id, assignee.email);
        for (const [recipientId, email] of recipients) {
          await notify({
            userId: recipientId,
            organizationId,
            type: "TICKET_REPLIED",
            title: `Customer replied on ${full.publicId}`,
            body: full.subject,
            link: `/app/tickets/${ticketId}`,
            dedupeKey: `creply:${message.id}:${recipientId}`,
            email: {
              to: email,
              template: "ticket_replied",
              ...ticketRepliedEmail({
                orgName: name,
                ticketRef: full.publicId,
                subject: full.subject,
                actorName: full.requester.name,
                snippet: body.slice(0, 280),
                url: ticketUrl(organizationId, ticketId, true),
              }),
            },
          }).catch(() => {});
        }
        await runAutomations(organizationId, ticketId, "message.public").catch(() => {});
      }

      await emitEvent(organizationId, "message.public", {
        ticketId,
        publicId: full.publicId,
        visibility,
        staff: staffReply,
      }).catch(() => {});
    }
  }

  return message;
}

export type UpdateTicketInput = {
  status?: TicketStatus;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  assigneeId?: string | null;
};

// Material updates restricted to staff; status must follow the transition map.
export async function updateTicket(
  organizationId: string,
  actorId: string,
  role: Role,
  ticketId: string,
  input: UpdateTicketInput,
) {
  if (!isStaff(role)) throw forbidden();

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId },
  });
  if (!ticket) throw notFound();

  if (input.status && !canTransition(ticket.status, input.status)) {
    throw new Error(`Invalid transition ${ticket.status} -> ${input.status}`);
  }

  const data: Prisma.TicketUpdateInput = {};
  if (input.status) {
    data.status = input.status;
    data.resolvedAt = CLOSED_LIKE.includes(input.status) ? new Date() : null;
  }
  if (input.priority) data.priority = input.priority;
  if (input.assigneeId !== undefined) {
    if (input.assigneeId) data.assignee = { connect: { id: input.assigneeId } };
    else data.assignee = { disconnect: true };
  }

  const updated = await prisma.ticket.update({ where: { id: ticketId }, data });

  const changed = Object.keys(data);
  if (changed.length > 0) {
    await prisma.ticketEvent.create({
      data: {
        organizationId,
        ticketId,
        actorId,
        eventType: "ticket.updated",
        beforeJson: { status: ticket.status, priority: ticket.priority, assigneeId: ticket.assigneeId },
        afterJson: { status: updated.status, priority: updated.priority, assigneeId: updated.assigneeId },
      },
    });
  }

  const meta = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      publicId: true,
      subject: true,
      requesterId: true,
      requester: { select: { email: true } },
    },
  });

  if (meta && input.assigneeId && input.assigneeId !== ticket.assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: input.assigneeId },
      select: { id: true, email: true },
    });
    if (assignee) {
      const name = await orgName(organizationId);
      await notify({
        userId: assignee.id,
        organizationId,
        type: "TICKET_ASSIGNED",
        title: `Assigned: ${meta.publicId}`,
        body: meta.subject,
        link: `/app/tickets/${ticketId}`,
        email: {
          to: assignee.email,
          template: "ticket_assigned",
          ...ticketAssignedEmail({
            orgName: name,
            ticketRef: meta.publicId,
            subject: meta.subject,
            url: ticketUrl(organizationId, ticketId, true),
          }),
        },
      }).catch(() => {});
    }
  }

  if (
    meta &&
    input.status &&
    CLOSED_LIKE.includes(input.status) &&
    !CLOSED_LIKE.includes(ticket.status)
  ) {
    const name = await orgName(organizationId);
    await notify({
      userId: meta.requesterId,
      organizationId,
      type: "TICKET_RESOLVED",
      title: `${meta.publicId} resolved`,
      body: meta.subject,
      link: `/portal/tickets/${ticketId}`,
      email: {
        to: meta.requester.email,
        template: "ticket_resolved",
        ...ticketResolvedEmail({
          orgName: name,
          ticketRef: meta.publicId,
          subject: meta.subject,
          url: ticketUrl(organizationId, ticketId, false),
        }),
      },
    }).catch(() => {});
    await notify({
      userId: meta.requesterId,
      organizationId,
      type: "CSAT",
      title: `How did we do on ${meta.publicId}?`,
      link: `/portal/tickets/${ticketId}`,
      dedupeKey: `csat:${ticketId}`,
      email: {
        to: meta.requester.email,
        template: "csat",
        ...csatEmail({
          orgName: name,
          ticketRef: meta.publicId,
          subject: meta.subject,
          url: ticketUrl(organizationId, ticketId, false),
        }),
      },
    }).catch(() => {});
    await emitEvent(organizationId, "ticket.resolved", { ticketId, publicId: meta.publicId }).catch(() => {});
  }

  if (changed.length > 0) {
    await runAutomations(organizationId, ticketId, "ticket.updated").catch(() => {});
    await emitEvent(organizationId, "ticket.updated", {
      ticketId,
      status: updated.status,
      priority: updated.priority,
      assigneeId: updated.assigneeId,
    }).catch(() => {});
  }

  return updated;
}

export async function ticketStatusCounts(organizationId: string) {
  const rows = await prisma.ticket.groupBy({
    by: ["status"],
    where: { organizationId },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = r._count._all;
  return counts;
}
