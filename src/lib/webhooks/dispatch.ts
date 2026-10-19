import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { decryptSecrets } from "@/lib/security/secrets";
import type { Prisma } from "@prisma/client";

export const WEBHOOK_EVENTS = [
  "ticket.created",
  "ticket.updated",
  "ticket.resolved",
  "message.public",
  "chat.handoff",
  "payment.paid",
  "sla.breached",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const MAX_ATTEMPTS = 5;

// Basic SSRF guard: reject non-http(s) and private/loopback hosts.
export function isDeliverableUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return false;
  if (/^(10|127)\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (host === "169.254.169.254") return false;
  return true;
}

function sign(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

// Queues and attempts delivery of an event to all matching endpoints.
export async function emitEvent(
  organizationId: string,
  event: WebhookEvent | string,
  payload: Record<string, unknown>,
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId, enabled: true },
  });
  const matching = endpoints.filter(
    (ep) => ep.events.length === 0 || ep.events.includes(event) || ep.events.includes("*"),
  );
  if (matching.length === 0) return;

  await Promise.allSettled(
    matching.map(async (ep) => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          organizationId,
          endpointId: ep.id,
          event,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      await attemptDelivery(delivery.id);
    }),
  );
}

export async function attemptDelivery(deliveryId: string): Promise<boolean> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });
  if (!delivery || !delivery.endpoint.enabled) return false;
  if (!isDeliverableUrl(delivery.endpoint.url)) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "FAILED", error: "target_url_not_allowed", attempts: { increment: 1 } },
    });
    return false;
  }

  const body = JSON.stringify({
    event: delivery.event,
    deliveryId: delivery.id,
    createdAt: delivery.createdAt.toISOString(),
    data: delivery.payload,
  });
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "HelpDeskFlow-Webhooks/1.0",
    "x-hdf-event": delivery.event,
    "x-hdf-delivery": delivery.id,
  };
  if (delivery.endpoint.secret) {
    const secret = decryptSecrets(delivery.endpoint.secret).secret;
    if (secret) headers["x-hdf-signature"] = sign(secret, body);
  }

  try {
    const res = await fetch(delivery.endpoint.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(8000),
    });
    const ok = res.status >= 200 && res.status < 300;
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: ok ? "SUCCESS" : "FAILED",
        attempts: { increment: 1 },
        responseCode: res.status,
        error: ok ? null : `http_${res.status}`,
      },
    });
    return ok;
  } catch (error) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        error: error instanceof Error ? error.message.slice(0, 200) : "delivery_failed",
      },
    });
    return false;
  }
}

// Retries failed deliveries that still have attempts left.
export async function retryFailedDeliveries(limit = 50): Promise<number> {
  const pending = await prisma.webhookDelivery.findMany({
    where: { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  let ok = 0;
  for (const d of pending) {
    if (await attemptDelivery(d.id)) ok += 1;
  }
  return ok;
}
