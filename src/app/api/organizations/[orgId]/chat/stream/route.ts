import { handle, notFound } from "@/lib/api";
import { requireOrgMember } from "@/lib/auth";
import { isUuid } from "@/lib/security/sanitize";
import { sseResponse } from "@/lib/chat/transport";
import { chatBus } from "@/lib/chat/bus";

// GET /organizations/:orgId/chat/stream — notify the console of new activity.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  return handle(async () => {
    const { orgId } = await params;
    if (!isUuid(orgId)) throw notFound();
    await requireOrgMember(orgId, "AGENT");

    return sseResponse(request, (send) =>
      chatBus.subscribe(`org:${orgId}`, (event) => {
        if (event.type === "conversation") {
          send("conversation", { conversationId: event.conversationId });
        }
      }),
    );
  });
}
