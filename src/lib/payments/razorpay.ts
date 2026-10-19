import crypto from "node:crypto";
import { getRazorpaySettings } from "@/lib/integrations/store";

const API_BASE = "https://api.razorpay.com/v1";

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

function authHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function createRazorpayOrder(input: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const settings = await getRazorpaySettings();
  if (!settings.configured) throw new Error("Razorpay is not configured.");

  const response = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(settings.keyId, settings.keySecret),
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes ?? {},
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Razorpay order failed (${response.status}): ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as RazorpayOrder;
  return { id: data.id, amount: data.amount, currency: data.currency, status: data.status };
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  if (!webhookSecret) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
