import { dataResponse, handle, notFound } from "@/lib/api";
import { requireOrgMember } from "@/lib/auth";
import { isUuid } from "@/lib/security/sanitize";
import {
  getConversationForOrg,
  listMessages,
  markConversationRead,
} from "@/lib/chat/service";

// GET /organizations/:orgId/chat/:conversationId — thread transcript; viewing a
// thread clears its unread badge for staff.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; conversationId: string }> },
) {
  return handle(async () => {
    const { orgId, conversationId } = await params;
    if (!isUuid(orgId) || !isUuid(conversationId)) throw notFound();
    await requireOrgMember(orgId, "AGENT");

    const conversation = await getConversationForOrg(conversationId, orgId);
    if (!conversation) throw notFound();

    const messages = await listMessages(conversationId);
    if (conversation.unreadForStaff > 0) {
      await markConversationRead(orgId, conversationId);
    }

    return dataResponse(
      {
        conversation: {
          id: conversation.id,
          visitorName: conversation.visitorName,
          visitorEmail: conversation.visitorEmail,
          pageUrl: conversation.pageUrl,
          status: conversation.status,
        },
        messages,
      },
      200,
      { count: messages.length },
    );
  });
}
