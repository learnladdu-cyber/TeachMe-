import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { dataResponse, handle, ApiError } from "@/lib/api";
import { uniqueSlug } from "@/lib/slug";
import { assertJsonContentType, assertSameOrigin, readJson } from "@/lib/security/csrf";
import { clientMetaFromRequest } from "@/lib/security/request";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { recordSecurityEvent } from "@/lib/security/audit";
import { passwordProblems } from "@/lib/security/password-policy";
import { emailSchema, shortText } from "@/lib/validation/schemas";
import { newChatKey } from "@/lib/chat/service";
import { LATEST_VERSION, LATEST_WIDGET_VERSION } from "@/lib/releases";
import { checkSignupEmail, verificationRequired } from "@/lib/email/rules";
import { sendVerificationEmail } from "@/lib/email/verify";

const bodySchema = z.object({
  name: shortText(120),
  email: emailSchema,
  password: z.string().min(1).max(200),
  organizationName: shortText(160),
});

// Self-serve signup: creates user + organization + ORG_ADMIN membership.
export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    assertJsonContentType(request);
    const meta = clientMetaFromRequest(request);

    enforceRateLimit(
      `register:ip:${meta.ip}`,
      10,
      60 * 60_000,
      "Too many sign-up attempts. Please try again later.",
    );

    const body = bodySchema.parse(await readJson(request));
    const email = body.email.toLowerCase();

    const problems = passwordProblems(body.password, { email, name: body.name });
    if (problems.length > 0) {
      throw new ApiError(422, "weak_password", problems[0], { password: problems });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, "conflict", "An account with that email already exists.");

    const emailCheck = await checkSignupEmail(email);
    if (!emailCheck.allowed) {
      throw new ApiError(422, "email_not_allowed", emailCheck.reason, { email: [emailCheck.reason] });
    }

    const slug = await uniqueSlug(body.organizationName, async (s) =>
      Boolean(await prisma.organization.findUnique({ where: { slug: s } })),
    );

    const free = await prisma.plan.findUnique({ where: { name: "Free" } });
    const passwordHash = await hashPassword(body.password);
    const needsVerification = await verificationRequired();

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        passwordHash,
        passwordChangedAt: new Date(),
        emailVerifiedAt: needsVerification ? null : new Date(),
        memberships: {
          create: {
            role: "ORG_ADMIN",
            organization: {
              create: {
                name: body.organizationName,
                slug,
                planId: free?.id,
                chatKey: newChatKey(),
                appVersion: LATEST_VERSION,
                chatWidgetVersion: LATEST_WIDGET_VERSION,
              },
            },
          },
        },
      },
      include: { memberships: true },
    });

    const orgId = user.memberships[0]?.organizationId ?? null;

    await recordSecurityEvent({
      type: "register",
      userId: user.id,
      organizationId: orgId,
      email,
      headers: request.headers,
    });

    if (needsVerification) {
      await sendVerificationEmail({ id: user.id, email: user.email, name: user.name });
      return dataResponse(
        { id: user.id, email: user.email, name: user.name, organizationId: orgId, requiresVerification: true },
        201,
      );
    }

    await createSession(user.id, orgId, {
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
    });

    return dataResponse(
      { id: user.id, email: user.email, name: user.name, organizationId: orgId, requiresVerification: false },
      201,
    );
  });
}
