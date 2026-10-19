import { dataResponse, handle } from "@/lib/api";
import { assertCron } from "@/lib/cron";
import { sweepSla } from "@/lib/sla";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { slaBreachEmail } from "@/lib/email/ticket-templates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// POST /api/cron/sla — flags breached tickets and escalates to owners/admins.
export async function POST(request: Request) {
  return handle(async () => {
    assertCron(request);
    const breaches = await sweepSla();

    for (const breach of breaches) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: breach.ticketId },
        select: { subject: true, assigneeId: true },
      });
      const org = await prisma.organization.findUnique({
        where: { id: breach.organizationId },
        select: { name: true },
      });
      if (!ticket) continue;

      const recipients = await prisma.membership.findMany({
        where: {
          organizationId: breach.organizationId,
          status: "ACTIVE",
          role: { in: ["TEAM_LEAD", "ORG_ADMIN"] },
        },
        select: { userId: true, user: { select: { email: true } } },
      });
      const targets = new Map(recipients.map((r) => [r.userId, r.user.email]));
      if (breach.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: breach.assigneeId },
          select: { email: true },
        });
        if (assignee) targets.set(breach.assigneeId, assignee.email);
      }

      const url = `${APP_URL}/app/tickets/${breach.ticketId}`;
      for (const [userId, email] of targets) {
        await notify({
          userId,
          organizationId: breach.organizationId,
          type: "SLA_BREACH",
          title: `SLA breach: ${breach.publicId}`,
          body: ticket.subject,
          link: `/app/tickets/${breach.ticketId}`,
          dedupeKey: `sla:${breach.ticketId}:${userId}`,
          email: {
            to: email,
            template: "sla_breach",
            ...slaBreachEmail({
              orgName: org?.name ?? "HelpDeskFlow",
              ticketRef: breach.publicId,
              subject: ticket.subject,
              url,
            }),
          },
        }).catch(() => {});
      }

      await emitEvent(breach.organizationId, "sla.breached", {
        ticketId: breach.ticketId,
        publicId: breach.publicId,
        kind: breach.kind,
      }).catch(() => {});
    }

    return dataResponse({ breached: breaches.length });
  });
}
