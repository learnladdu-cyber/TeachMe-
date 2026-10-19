import { z } from "zod";
import { prisma } from "@/lib/db";
import { dataResponse, handle } from "@/lib/api";
import { assertJsonContentType, assertSameOrigin, readJson } from "@/lib/security/csrf";
import { clientMetaFromRequest } from "@/lib/security/request";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { pepper } from "@/lib/security/secret";
import { emailSchema } from "@/lib/validation/schemas";
import { verificationRequired } from "@/lib/email/rules";
import { sendVerificationEmail } from "@/lib/email/verify";

const bodySchema = z.object({ email: emailSchema });

// Re-sends the verification link. Always responds generically so it can't be
// used to enumerate accounts.
export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    assertJsonContentType(request);
    const meta = clientMetaFromRequest(request);

    enforceRateLimit(`verify:resend:ip:${meta.ip}`, 10, 60 * 60_000, "Too many requests. Try again later.");

    const body = bodySchema.parse(await readJson(request));
    const email = body.email.toLowerCase();
    enforceRateLimit(`verify:resend:email:${pepper(email)}`, 5, 60 * 60_000, "Too many requests. Try again later.");

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });

    if (user && !user.emailVerifiedAt && (await verificationRequired())) {
      await sendVerificationEmail({ id: user.id, email: user.email, name: user.name });
    }

    return dataResponse({ ok: true });
  });
}
