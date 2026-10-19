import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  organizationId?: string | null;
  dedupeKey?: string;
  email?: { to: string; subject: string; html: string; text?: string; template?: string } | null;
};

// Creates an in-app notification and, when an email payload is supplied and
// SMTP is configured, sends it. Email attempts are logged in EmailLog.
export async function notify(input: NotifyInput) {
  let notification = null as Awaited<ReturnType<typeof prisma.notification.create>> | null;

  if (input.dedupeKey) {
    const existing = await prisma.notification.findFirst({
      where: { userId: input.userId, dedupeKey: input.dedupeKey },
      select: { id: true },
    });
    if (existing) return null;
  }

  notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      dedupeKey: input.dedupeKey ?? null,
    },
  });

  if (input.email) {
    await sendLoggedEmail({
      to: input.email.to,
      subject: input.email.subject,
      html: input.email.html,
      text: input.email.text,
      template: input.email.template,
      organizationId: input.organizationId ?? null,
    });
  }

  return notification;
}

export async function sendLoggedEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: string;
  organizationId?: string | null;
}): Promise<boolean> {
  const log = await prisma.emailLog
    .create({
      data: {
        to: input.to,
        subject: input.subject,
        template: input.template ?? null,
        organizationId: input.organizationId ?? null,
        status: "PENDING",
      },
    })
    .catch(() => null);

  const ok = await sendMail({ to: input.to, subject: input.subject, html: input.html, text: input.text });

  if (log) {
    await prisma.emailLog
      .update({
        where: { id: log.id },
        data: { status: ok ? "SENT" : "SKIPPED", attempts: { increment: 1 }, error: ok ? null : "smtp_unconfigured_or_failed" },
      })
      .catch(() => {});
  }
  return ok;
}

export async function listNotifications(userId: string, limit = 40) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
