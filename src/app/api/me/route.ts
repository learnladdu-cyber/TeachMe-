import { dataResponse, handle, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";

export async function GET() {
  return handle(async () => {
    const session = await getSession();
    if (!session) throw unauthorized();
    return dataResponse({
      user: session.user,
      activeOrganizationId: session.activeOrganizationId,
      memberships: session.memberships,
    });
  });
}
