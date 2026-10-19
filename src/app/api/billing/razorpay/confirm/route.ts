import { z } from "zod";
import { handle, dataResponse, ApiError, unauthorized, forbidden } from "@/lib/api";
import { getActiveContext, roleAtLeast } from "@/lib/auth";
import { assertJsonContentType, assertSameOrigin, readJson } from "@/lib/security/csrf";
import { getRazorpaySettings } from "@/lib/integrations/store";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
import { fulfillPayment } from "@/lib/payments/fulfill";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1).max(120),
  razorpay_payment_id: z.string().min(1).max(120),
  razorpay_signature: z.string().min(1).max(256),
});

// Client-side checkout callback: verifies the payment signature, then fulfills.
export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    assertJsonContentType(request);

    const ctx = await getActiveContext();
    if (!ctx) throw unauthorized();
    if (!roleAtLeast(ctx.role, "ORG_ADMIN")) throw forbidden();

    const settings = await getRazorpaySettings();
    if (!settings.configured) throw new ApiError(503, "payments_unavailable", "Online payments are not enabled.");

    const body = bodySchema.parse(await readJson(request));

    const valid = verifyPaymentSignature(
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature,
      settings.keySecret,
    );
    if (!valid) throw new ApiError(400, "invalid_signature", "Payment verification failed.");

    const result = await fulfillPayment({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
    });
    if (!result.ok) throw new ApiError(400, "payment_failed", "We could not record this payment.");

    return dataResponse({ ok: true, duplicate: result.duplicate ?? false });
  });
}
