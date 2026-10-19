import { prisma } from "@/lib/db";
import { clientMetaFromHeaders } from "@/lib/security/request";

export type SecurityEventType =
  | "login.success"
  | "login.failure"
  | "login.locked"
  | "logout"
  | "register"
  | "password.changed"
  | "session.revoked"
  | "sessions.revoked_all"
  | "rate_limited";

export type SecurityEventInput = {
  type: SecurityEventType;
  userId?: string | null;
  organizationId?: string | null;
  email?: string | null;
  headers?: Headers;
  detail?: string | null;
};

// Best-effort audit trail: never let a logging failure break the request.
export async function recordSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    const meta = input.headers ? clientMetaFromHeaders(input.headers) : null;
    await prisma.securityEvent.create({
      data: {
        type: input.type,
        userId: input.userId ?? null,
        organizationId: input.organizationId ?? null,
        email: input.email ?? null,
        ipHash: meta?.ipHash ?? null,
        userAgent: meta?.userAgent ?? null,
        detail: input.detail ?? null,
      },
    });
  } catch (error) {
    console.error("[security] failed to record event", input.type, error);
  }
}
