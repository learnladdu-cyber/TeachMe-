import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const SESSION_TTL_DAYS = 14;
const SESSION_IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES ?? 480);
const MAX_ACTIVE_SESSIONS = 10;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

// Prefer the `__Host-` cookie prefix (requires Secure + Path=/ + no Domain)
// whenever the app is served over HTTPS. Falls back to a plain name otherwise.
const isHttps = (process.env.APP_URL ?? "").startsWith("https://");
export const SESSION_COOKIE = isHttps ? "__Host-hdf_session" : "hdf_session";
const LEGACY_COOKIE = "hdf_session";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionContext = {
  sessionId: string;
  user: {
    id: string;
    email: string;
    name: string;
    isPlatformAdmin: boolean;
  };
  activeOrganizationId: string | null;
  memberships: {
    organizationId: string;
    role: string;
    organization: { id: string; name: string; slug: string };
  }[];
};

export type SessionMeta = { ipHash?: string | null; userAgent?: string | null };

export async function createSession(
  userId: string,
  activeOrganizationId: string | null,
  meta: SessionMeta = {},
): Promise<void> {
  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      activeOrganizationId,
      ipHash: meta.ipHash ?? null,
      userAgent: meta.userAgent ?? null,
      expiresAt,
    },
  });

  // Bound the number of concurrent sessions per user (session-fixation blast
  // radius) by revoking the oldest beyond the cap.
  const active = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (active.length > MAX_ACTIVE_SESSIONS) {
    const stale = active.slice(MAX_ACTIVE_SESSIONS).map((s) => s.id);
    await prisma.session.updateMany({
      where: { id: { in: stale } },
      data: { revokedAt: new Date() },
    });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps || process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSession(): Promise<SessionContext | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value ?? store.get(LEGACY_COOKIE)?.value;
  if (!raw) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: {
      user: {
        include: {
          memberships: {
            include: { organization: { select: { id: true, name: true, slug: true } } },
          },
        },
      },
    },
  });

  if (!session) return null;

  const now = new Date();
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_MINUTES * 60 * 1000);
  const idleExpired = session.lastSeenAt < idleCutoff;

  if (session.revokedAt || session.expiresAt < now || idleExpired) {
    // Clean up an idle/expired/revoked session lazily.
    await prisma.session
      .updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: now } })
      .catch(() => {});
    return null;
  }

  // Throttle activity writes to once per interval.
  if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: now } })
      .catch(() => {});
  }

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      isPlatformAdmin: session.user.isPlatformAdmin,
    },
    activeOrganizationId:
      session.activeOrganizationId ?? session.user.memberships[0]?.organizationId ?? null,
    memberships: session.user.memberships.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
      organization: m.organization,
    })),
  };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value ?? store.get(LEGACY_COOKIE)?.value;
  if (raw) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(SESSION_COOKIE);
  store.delete(LEGACY_COOKIE);
}

export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(
  userId: string,
  options: { exceptSessionId?: string } = {},
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(options.exceptSessionId ? { id: { not: options.exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export type SessionSummary = {
  id: string;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  current: boolean;
};

export async function listSessions(
  userId: string,
  currentSessionId: string,
): Promise<SessionSummary[]> {
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, createdAt: true, lastSeenAt: true, expiresAt: true },
  });
  return sessions.map((s) => ({ ...s, current: s.id === currentSessionId }));
}

export async function setActiveOrganization(organizationId: string): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value ?? store.get(LEGACY_COOKIE)?.value;
  if (!raw) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(raw) },
    data: { activeOrganizationId: organizationId },
  });
}
