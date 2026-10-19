import { dataResponse, handle, notFound } from "@/lib/api";
import { requireOrgMember } from "@/lib/auth";
import { isUuid } from "@/lib/security/sanitize";
import { assertJsonContentType, assertSameOrigin, readJson } from "@/lib/security/csrf";
import { getConversationForOrg, setConversationStatus } from "@/lib/chat/service";
import { statusSchema } from "@/lib/chat/validation";

// POST /organizations/:orgId/chat/:conversationId/status — open/close a chat.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; conversationId: string }> },
) {
  return handle(async () => {
    assertSameOrigin(request);
    assertJsonContentType(request);
    const { orgId, conversationId } = await params;
    if (!isUuid(orgId) || !isUuid(conversationId)) throw notFound();
    await requireOrgMember(orgId, "AGENT");

    const conversation = await getConversationForOrg(conversationId, orgId);
    if (!conversation) throw notFound();

    const { status } = statusSchema.parse(await readJson(request));
    await setConversationStatus(orgId, conversationId, status);
    return dataResponse({ id: conversationId, status });
  });
}
