import nodemailer, { type Transporter } from "nodemailer";
import { getSmtpSettings } from "@/lib/integrations/store";

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let cached: { key: string; transport: Transporter } | null = null;

const RESEND_KEY = process.env.RESEND_API_KEY?.trim() ?? "";

// Resend delivers over SMTP; when RESEND_API_KEY is present it takes priority
// over the database-configured SMTP settings so transactional mail (verification,
// admin sign-in codes) works out of the box on serverless hosts.
function resendTransport(): { transport: Transporter; from: string } | null {
  if (!RESEND_KEY) return null;
  const cacheKey = `resend:${RESEND_KEY.slice(-6)}`;
  if (!cached || cached.key !== cacheKey) {
    cached = {
      key: cacheKey,
      transport: nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: RESEND_KEY },
      }),
    };
  }
  const from = process.env.RESEND_FROM?.trim() || "HelpDeskFlow <onboarding@resend.dev>";
  return { transport: cached.transport, from };
}

async function getTransport(): Promise<{ transport: Transporter; from: string } | null> {
  const resend = resendTransport();
  if (resend) return resend;

  const smtp = await getSmtpSettings();
  if (!smtp.configured) return null;

  const cacheKey = `${smtp.host}:${smtp.port}:${smtp.secure}:${smtp.username}`;
  if (!cached || cached.key !== cacheKey) {
    cached = {
      key: cacheKey,
      transport: nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.username ? { user: smtp.username, pass: smtp.password } : undefined,
      }),
    };
  }
  return { transport: cached.transport, from: `${smtp.fromName} <${smtp.fromEmail}>` };
}

export async function mailerConfigured(): Promise<boolean> {
  if (RESEND_KEY) return true;
  const smtp = await getSmtpSettings();
  return smtp.configured;
}

// Sends an email. Never throws — returns false so callers can degrade safely.
export async function sendMail(input: SendMailInput): Promise<boolean> {
  try {
    const resolved = await getTransport();
    if (!resolved) {
      console.warn("[email] SMTP not configured; skipping message", input.subject);
      return false;
    }
    await resolved.transport.sendMail({
      from: resolved.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return true;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}
