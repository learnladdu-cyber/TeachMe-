import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getActiveContext, roleAtLeast, type OrgAccess } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function requireStaff(minRole: Role = "AGENT"): Promise<OrgAccess> {
  const ctx = await getActiveContext();
  if (!ctx) {
    const session = await getSession();
    redirect(session?.user.isPlatformAdmin ? "/admin" : "/login");
  }
  if (ctx.role === "CUSTOMER") redirect("/portal");
  if (!roleAtLeast(ctx.role, minRole)) redirect("/app");
  return ctx;
}
