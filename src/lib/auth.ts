import { Role } from "@prisma/client";
import { forbidden, unauthorized } from "@/lib/api";
import { getSession, type SessionContext } from "@/lib/session";

export const ROLE_RANK: Record<Role, number> = {
  CUSTOMER: 0,
  AGENT: 1,
  TEAM_LEAD: 2,
  ORG_ADMIN: 3,
  PLATFORM_ADMIN: 4,
};

export function isStaff(role: Role): boolean {
  return role === "AGENT" || role === "TEAM_LEAD" || role === "ORG_ADMIN";
}

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw unauthorized();
  return session;
}

export async function getActiveContext(): Promise<OrgAccess | null> {
  const session = await getSession();
  if (!session) return null;
  const orgId = session.activeOrganizationId;
  if (!orgId) return null;
  const membership = session.memberships.find((m) => m.organizationId === orgId);
  const role = (membership?.role as Role | undefined) ?? (session.user.isPlatformAdmin ? "PLATFORM_ADMIN" : undefined);
  if (!role) return null;
  return { session, organizationId: orgId, role };
}

export type OrgAccess = {
  session: SessionContext;
  organizationId: string;
  role: Role;
};

// Server-side tenant authorization: verifies membership on every request.
export async function requireOrgMember(orgId: string, minRole: Role = "CUSTOMER"): Promise<OrgAccess> {
  const session = await requireSession();
  const membership = session.memberships.find((m) => m.organizationId === orgId);
  if (!membership) {
    // Platform admins may access any tenant (privileged, audited elsewhere).
    if (session.user.isPlatformAdmin) {
      return { session, organizationId: orgId, role: "PLATFORM_ADMIN" };
    }
    throw forbidden();
  }
  const role = membership.role as Role;
  if (!roleAtLeast(role, minRole)) throw forbidden();
  return { session, organizationId: orgId, role };
}
