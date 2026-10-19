import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, dataResponse, ApiError, unauthorized, forbidden } from "@/lib/api";
import { getActiveContext, roleAtLeast } from "@/lib/auth";
import { assertJsonContentType, assertSameOrigin, readJson } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { uuidSchema } from "@/lib/validation/schemas";
import { getRazorpaySettings } from "@/lib/integrations/store";
import { createRazorpayOrder } from "@/lib/payments/razorpay";

const bodySchema = z.object({ planId: uuidSchema });

// Creates a Razorpay order for a paid plan upgrade in the active organization.
export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    assertJsonContentType(request);

    const ctx = await getActiveContext();
    if (!ctx) throw unauthorized();
    if (!roleAtLeast(ctx.role, "ORG_ADMIN")) throw forbidden();

    enforceRateLimit(`billing:order:${ctx.organizationId}`, 20, 60 * 60_000, "Too many payment attempts.");

    const settings = await getRazorpaySettings();
    if (!settings.enabled || !settings.configured) {
      throw new ApiError(503, "payments_unavailable", "Online payments are not enabled.");
    }

    const body = bodySchema.parse(await readJson(request));
    const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
    if (!plan) throw new ApiError(404, "not_found", "Plan not found.");
    if (!plan.priceMonthly || plan.priceMonthly <= 0) {
      throw new ApiError(422, "invalid_plan", "This plan does not require payment.");
    }

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { id: true, name: true },
    });

    const amount = plan.priceMonthly * 100;
    const order = await createRazorpayOrder({
      amount,
      currency: settings.currency,
      receipt: `org_${Date.now()}`,
      notes: { organizationId: ctx.organizationId, planId: plan.id, planName: plan.name },
    });

    await prisma.payment.create({
      data: {
        organizationId: ctx.organizationId,
        provider: "razorpay",
        orderId: order.id,
        amount,
        currency: order.currency,
        status: "created",
        planId: plan.id,
        notes: { planName: plan.name, organizationName: org?.name ?? "" },
      },
    });

    return dataResponse({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: settings.keyId,
      planName: plan.name,
      organizationName: org?.name ?? "",
      prefill: { name: ctx.session.user.name, email: ctx.session.user.email },
    });
  });
}
