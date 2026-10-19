import { escapeHtml } from "@/lib/security/sanitize";
import { shell } from "@/lib/email/templates";

export type TicketEmailInput = {
  orgName: string;
  ticketRef: string;
  subject: string;
  actorName?: string;
  snippet?: string;
  url: string;
  score?: number;
};

export function ticketCreatedEmail(input: TicketEmailInput) {
  const subject = `[${input.ticketRef}] ${input.subject}`;
  const body = `<p>Hi,</p><p>We received your request <strong>${escapeHtml(input.ticketRef)}</strong> — “${escapeHtml(
    input.subject,
  )}”. Our team will get back to you shortly.</p>${
    input.snippet ? `<blockquote style="border-left:3px solid #e5e8f0;margin:12px 0;padding:4px 12px;color:#6b6880;">${escapeHtml(input.snippet)}</blockquote>` : ""
  }`;
  return { subject, html: shell("We've got your request", body, { label: "View ticket", url: input.url }), text: `${subject}\n\n${input.url}` };
}

export function ticketRepliedEmail(input: TicketEmailInput) {
  const subject = `Re: [${input.ticketRef}] ${input.subject}`;
  const body = `<p>${escapeHtml(input.actorName ?? "Support")} replied to <strong>${escapeHtml(
    input.ticketRef,
  )}</strong>.</p>${
    input.snippet ? `<blockquote style="border-left:3px solid #e5e8f0;margin:12px 0;padding:4px 12px;color:#6b6880;">${escapeHtml(input.snippet)}</blockquote>` : ""
  }`;
  return { subject, html: shell("New reply on your ticket", body, { label: "Reply", url: input.url }), text: `${subject}\n\n${input.url}` };
}

export function ticketAssignedEmail(input: TicketEmailInput) {
  const subject = `Assigned: [${input.ticketRef}] ${input.subject}`;
  const body = `<p>A ticket was assigned to you — <strong>${escapeHtml(input.ticketRef)}</strong>: ${escapeHtml(input.subject)}.</p>`;
  return { subject, html: shell("Ticket assigned to you", body, { label: "Open ticket", url: input.url }), text: `${subject}\n\n${input.url}` };
}

export function ticketResolvedEmail(input: TicketEmailInput) {
  const subject = `Resolved: [${input.ticketRef}] ${input.subject}`;
  const body = `<p>Your request <strong>${escapeHtml(input.ticketRef)}</strong> has been marked resolved. If it isn't, just reply and we'll reopen it.</p>`;
  return { subject, html: shell("Your request is resolved", body, { label: "View ticket", url: input.url }), text: `${subject}\n\n${input.url}` };
}

export function slaBreachEmail(input: TicketEmailInput) {
  const subject = `SLA breach: [${input.ticketRef}] ${input.subject}`;
  const body = `<p>Ticket <strong>${escapeHtml(input.ticketRef)}</strong> (“${escapeHtml(
    input.subject,
  )}”) has breached its SLA target and needs attention.</p>`;
  return { subject, html: shell("SLA breach", body, { label: "Open ticket", url: input.url }), text: `${subject}\n\n${input.url}` };
}

export function csatEmail(input: TicketEmailInput) {
  const subject = `How did we do? [${input.ticketRef}]`;
  const body = `<p>Thanks for reaching out. How satisfied were you with the support on <strong>${escapeHtml(
    input.ticketRef,
  )}</strong>?</p><p style="font-size:22px;letter-spacing:6px;">1 · 2 · 3 · 4 · 5</p>`;
  return { subject, html: shell("How did we do?", body, { label: "Rate this ticket", url: input.url }), text: `${subject}\n\n${input.url}` };
}

export function inviteEmail(input: { orgName: string; inviterName: string; role: string; url: string }) {
  const subject = `You're invited to ${input.orgName} on HelpDeskFlow`;
  const body = `<p><strong>${escapeHtml(input.inviterName)}</strong> invited you to join <strong>${escapeHtml(
    input.orgName,
  )}</strong> as <strong>${escapeHtml(input.role.toLowerCase().replace("_", " "))}</strong>.</p><p>This invitation expires in 7 days.</p>`;
  return { subject, html: shell(`Join ${input.orgName}`, body, { label: "Accept invite", url: input.url }), text: `${subject}\n\n${input.url}` };
}
