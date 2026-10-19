import { z } from "zod";
import { sanitizeSingleLine } from "@/lib/security/sanitize";

export const chatKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/, "Invalid widget key.");

export const visitorIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/, "Invalid visitor id.");

export const conversationIdSchema = z.string().uuid();

export const startConversationSchema = z.object({
  visitorId: visitorIdSchema,
  visitorName: z.string().max(120).optional(),
  visitorEmail: z.string().email().max(200).optional().or(z.literal("")),
  pageUrl: z.string().max(500).optional().or(z.literal("")),
});

export const visitorMessageSchema = z.object({
  visitorId: visitorIdSchema,
  body: z.string().min(1).max(4000),
});

export const agentMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const statusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"]),
});

export const widgetConfigSchema = z.object({
  enabled: z.boolean(),
  welcome: z.string().max(240),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Accent must be a hex colour.")
    .default("#1b1533"),
  launcherLabel: z.string().max(60).default("Chat with us"),
  position: z.enum(["right", "left"]).default("right"),
  allowedOrigins: z.array(z.string().max(200)).max(50).default([]),
});

export function normalizeOrigin(value: string): string | null {
  const cleaned = sanitizeSingleLine(value, 200).replace(/\/+$/, "");
  if (!cleaned) return null;
  try {
    const url = new URL(cleaned.includes("://") ? cleaned : `https://${cleaned}`);
    return url.origin;
  } catch {
    return null;
  }
}
