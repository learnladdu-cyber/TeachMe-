import { prisma } from "@/lib/db";
import { getRazorpaySettings } from "@/lib/integrations/store";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { fulfillPayment } from "@/lib/payments/fulfill";

export const dynamic = "force-dynamic";

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    order?: { entity?: { id?: string } };
  };
};

// Razorpay webhook: source of truth for payment success. Signature-verified.
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  const settings = await getRazorpaySettings();
  if (!settings.webhookSecret) {
    return Response.json({ error: "webhook_not_configured" }, { status: 503 });
  }
  if (!signature || !verifyWebhookSignature(raw, signature, settings.webhookSecret)) {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw) as RazorpayEvent;
  } catch {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const paymentEntity = event.payload?.payment?.entity;
  const orderId =
    paymentEntity?.order_id ?? event.payload?.order?.entity?.id ?? undefined;
  const paymentId = paymentEntity?.id ?? null;

  if (orderId && (event.event === "payment.captured" || event.event === "order.paid")) {
    const result = await fulfillPayment({ orderId, paymentId });
    await prisma.securityEvent
      .create({
        data: {
          type: "billing.webhook",
          detail: `${event.event} order=${orderId} ok=${result.ok}`,
        },
      })
      .catch(() => undefined);
  }

  return Response.json({ received: true });
}
