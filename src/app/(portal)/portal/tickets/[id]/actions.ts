"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sanitizeMultiline } from "@/lib/security/sanitize";

export async function submitCsatAction(formData: FormData) {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");

  const ticketId = String(formData.get("ticketId") ?? "");
  const score = Number.parseInt(String(formData.get("score") ?? ""), 10);
  const comment = sanitizeMultiline(String(formData.get("comment") ?? ""), 1000);
  if (!ticketId || !Number.isInteger(score) || score < 1 || score > 5) {
    redirect(`/portal/tickets/${ticketId}?csat=invalid`);
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: ctx.organizationId, requesterId: ctx.session.user.id },
    select: { id: true },
  });
  if (!ticket) redirect("/portal");

  await prisma.csatResponse.upsert({
    where: { ticketId },
    update: { score, comment: comment || null },
    create: {
      organizationId: ctx.organizationId,
      ticketId,
      score,
      comment: comment || null,
    },
  });

  revalidatePath(`/portal/tickets/${ticketId}`);
  redirect(`/portal/tickets/${ticketId}?csat=thanks`);
}
