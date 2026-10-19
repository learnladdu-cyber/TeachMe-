import nodemailer, { type Transporter } from "nodemailer";
import { getSmtpSettings } from "@/lib/integrations/store";

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let cached: { key: string; transport: Transporter } | null = null;

async function getTransport(): Promise<{ transport: Transporter; from: string } | null> {
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
