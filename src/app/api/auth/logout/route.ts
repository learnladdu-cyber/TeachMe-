import { destroySession, getSession } from "@/lib/session";
import { dataResponse, handle } from "@/lib/api";
import { assertSameOrigin } from "@/lib/security/csrf";
import { recordSecurityEvent } from "@/lib/security/audit";

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const session = await getSession();
    await destroySession();
    if (session) {
      await recordSecurityEvent({
        type: "logout",
        userId: session.user.id,
        organizationId: session.activeOrganizationId,
        email: session.user.email,
        headers: request.headers,
      });
    }
    return dataResponse({ ok: true });
  });
}
