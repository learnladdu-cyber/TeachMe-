import { escapeHtml } from "@/lib/security/sanitize";

export function shell(title: string, body: string, cta?: { label: string; url: string }): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f4f1ea;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b1533;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="font-weight:700;font-size:18px;margin-bottom:20px;">HelpDeskFlow</div>
    <div style="background:#fff;border:1px solid #e5e8f0;border-radius:14px;padding:28px;">
      <h1 style="margin:0 0 12px;font-size:20px;">${escapeHtml(title)}</h1>
      <div style="font-size:14.5px;line-height:1.6;color:#3f3a52;">${body}</div>
      ${
        cta
          ? `<div style="margin-top:24px;"><a href="${cta.url}" style="display:inline-block;background:#1b1533;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">${escapeHtml(
              cta.label,
            )}</a></div>
             <p style="font-size:12.5px;color:#8a8498;margin-top:16px;word-break:break-all;">${cta.url}</p>`
          : ""
      }
    </div>
    <p style="font-size:12px;color:#8a8498;margin-top:18px;">You received this email from HelpDeskFlow. If you didn't expect it, you can ignore it.</p>
  </div>
</body></html>`;
}

export function verificationEmail(input: { name: string; url: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Verify your email address";
  const body = `<p>Hi ${escapeHtml(input.name)},</p><p>Confirm your email address to finish setting up your HelpDeskFlow account. This link expires in 24 hours.</p>`;
  return {
    subject,
    html: shell("Confirm your email", body, { label: "Verify email", url: input.url }),
    text: `Hi ${input.name},\n\nVerify your email address (expires in 24 hours):\n${input.url}\n`,
  };
}

export function testEmail(input: { name: string }): { subject: string; html: string; text: string } {
  const subject = "HelpDeskFlow test email";
  const body = `<p>Hi ${escapeHtml(input.name)},</p><p>Your SMTP settings are working — this is a test message sent from the admin panel.</p>`;
  return {
    subject,
    html: shell("SMTP test successful", body),
    text: `Hi ${input.name},\n\nYour SMTP settings are working.\n`,
  };
}
