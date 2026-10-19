import { dataResponse, handle, notFound } from "@/lib/api";
import { requireOrgMember } from "@/lib/auth";
import { isUuid } from "@/lib/security/sanitize";
import { listConversations } from "@/lib/chat/service";

// GET /organizations/:orgId/chat — conversation list for the agent console.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  return handle(async () => {
    const { orgId } = await params;
    if (!isUuid(orgId)) throw notFound();
    await requireOrgMember(orgId, "AGENT");

    const conversations = await listConversations(orgId);
    const unread = conversations.reduce((acc, c) => acc + c.unreadForStaff, 0);
    return dataResponse(conversations, 200, { count: conversations.length, unread });
  });
}
