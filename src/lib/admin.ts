import { redirect } from "next/navigation";
import { getSession, type SessionContext } from "@/lib/session";

// Gate for the standalone platform-admin area. Non-admins are bounced back to
// their workspace; unauthenticated visitors go to sign-in.
export async function requirePlatformAdmin(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.isPlatformAdmin) redirect("/app");
  return session;
}
