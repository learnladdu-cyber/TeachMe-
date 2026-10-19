import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { dataResponse, handle, ApiError } from "@/lib/api";
import { assertJsonContentType, assertSameOrigin, readJson } from "@/lib/security/csrf";
import { clientMetaFromRequest } from "@/lib/security/request";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { recordSecurityEvent } from "@/lib/security/audit";
import { pepper } from "@/lib/security/secret";
import { emailSchema } from "@/lib/validation/schemas";
import { verificationRequired } from "@/lib/email/rules";
import { hashBackupCode, verifyTotp } from "@/lib/twofactor";

const bodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
  totp: z.string().max(20).optional(),
});

const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS ?? 5);
const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES ?? 15);

// A valid scrypt hash checked against unknown emails so response timing does not
// reveal whether an account exists.
const DUMMY_HASH =
  "scrypt$16384$e8d8d85dd0ee4eeed050760a5ed71d40$628a6590216155ba021479531db328ce04a882a684797c165efaf0389d6e5434bf8bc66dbb1e4fd62f6b2b32ddaf14afef9560efe211319e3d48272b08028c85";

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    assertJsonContentType(request);
    const meta = clientMetaFromRequest(request);

    // Throttle both by network origin and by targeted account.
    enforceRateLimit(
      `login:ip:${meta.ip}`,
      30,
      15 * 60_000,
      "Too many sign-in attempts from this network. Please try again later.",
    );

    const body = bodySchema.parse(await readJson(request));
    const email = body.email.toLowerCase();

    enforceRateLimit(
      `login:email:${pepper(email)}`,
      10,
      15 * 60_000,
      "Too many sign-in attempts for this account. Please try again later.",
    );

    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: { orderBy: { role: "desc" } } },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      await recordSecurityEvent({
        type: "login.locked",
        userId: user.id,
        email,
        headers: request.headers,
        detail: `locked until ${user.lockedUntil.toISOString()}`,
      });
      throw new ApiError(
        423,
        "account_locked",
        "This account is temporarily locked after too many failed attempts. Try again later.",
      );
    }

    const ok = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !ok) {
      if (user) {
        const attempts = user.failedLoginAttempts + 1;
        const lock = attempts >= MAX_LOGIN_ATTEMPTS;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: lock ? 0 : attempts,
            lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
          },
        });
        await recordSecurityEvent({
          type: lock ? "login.locked" : "login.failure",
          userId: user.id,
          email,
          headers: request.headers,
          detail: `attempt ${attempts}/${MAX_LOGIN_ATTEMPTS}`,
        });
      } else {
        await recordSecurityEvent({
          type: "login.failure",
          email,
          headers: request.headers,
          detail: "unknown account",
        });
      }
      throw new ApiError(401, "invalid_credentials", "Invalid email or password.");
    }

    if (!user.emailVerifiedAt && (await verificationRequired())) {
      throw new ApiError(
        403,
        "email_unverified",
        "Please verify your email address before signing in. Check your inbox for the link.",
      );
    }

    if (user.totpEnabledAt) {
      const code = (body.totp ?? "").trim();
      if (!code) {
        throw new ApiError(401, "totp_required", "Enter the code from your authenticator app.");
      }
      const validTotp = user.totpSecret ? verifyTotp(user.totpSecret, code) : false;
      if (!validTotp) {
        const codes = Array.isArray(user.backupCodes) ? (user.backupCodes as string[]) : [];
        const hashed = hashBackupCode(code);
        if (!codes.includes(hashed)) {
          await recordSecurityEvent({
            type: "login.failure",
            userId: user.id,
            email,
            headers: request.headers,
            detail: "invalid 2fa code",
          });
          throw new ApiError(401, "invalid_totp", "That two-factor code is not valid.");
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { backupCodes: codes.filter((c) => c !== hashed) },
        });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    let activeOrgId: string | null =
      user.memberships.find((m) => m.role !== "CUSTOMER")?.organizationId ??
      user.memberships[0]?.organizationId ??
      null;

    // Platform admins may have no membership; give them a default tenant context
    // so the workspace shell can render (their access is permission-gated anyway).
    if (!activeOrgId && user.isPlatformAdmin) {
      const firstOrg = await prisma.organization.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      activeOrgId = firstOrg?.id ?? null;
    }

    await createSession(user.id, activeOrgId, {
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
    });

    await recordSecurityEvent({
      type: "login.success",
      userId: user.id,
      organizationId: activeOrgId,
      email,
      headers: request.headers,
    });

    return dataResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      isPlatformAdmin: user.isPlatformAdmin,
    });
  });
}
