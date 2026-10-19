import { dataResponse, handle, notFound } from "@/lib/api";
import { requireOrgMember } from "@/lib/auth";
import { isUuid } from "@/lib/security/sanitize";
import { assertJsonContentType, assertSameOrigin, readJson } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { addMessage, getConversationForOrg } from "@/lib/chat/service";
import { agentMessageSchema } from "@/lib/chat/validation";

// POST /organizations/:orgId/chat/:conversationId/messages — agent reply.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; conversationId: string }> },
) {
  return handle(async () => {
    assertSameOrigin(request);
    assertJsonContentType(request);
    const { orgId, conversationId } = await params;
    if (!isUuid(orgId) || !isUuid(conversationId)) throw notFound();
    const { session } = await requireOrgMember(orgId, "AGENT");

    const conversation = await getConversationForOrg(conversationId, orgId);
    if (!conversation) throw notFound();

    enforceRateLimit(
      `chat:agent:${orgId}:${session.user.id}`,
      120,
      60_000,
      "You are sending messages too quickly.",
    );

    const body = agentMessageSchema.parse(await readJson(request));

    const message = await addMessage(orgId, conversationId, {
      role: "AGENT",
      body: body.body,
      agentId: session.user.id,
    });

    return dataResponse({ message }, 201);
  });
}
