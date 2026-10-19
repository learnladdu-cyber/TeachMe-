import { dataResponse, handle } from "@/lib/api";
import { assertJsonContentType, readJson } from "@/lib/security/csrf";
import { preflight, withCors } from "@/lib/chat/transport";
import { requireChatOrg, requireVisitorConversation } from "@/lib/chat/guard";
import {
  addMessage,
  getConversationTicket,
  handoffConversationToTicket,
  listMessages,
} from "@/lib/chat/service";
import { z } from "zod";
import { visitorIdSchema } from "@/lib/chat/validation";

const schema = z.object({ visitorId: visitorIdSchema });

export async function OPTIONS(request: Request) {
  return preflight(request, ["*"]);
}

// POST /api/chat/:key/conversations/:id/handoff — visitor asks for a human.
// Creates a support ticket from the transcript (once) so the request flows
// through the same workspace pipeline as every other channel.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string; id: string }> },
) {
  return handle(async () => {
    assertJsonContentType(request);
    const { key, id } = await params;
    const org = await requireChatOrg(key);
    const body = schema.parse(await readJson(request));

    const conversation = await requireVisitorConversation(org.id, id, body.visitorId);

    const message = await addMessage(org.id, id, {
      role: "BOT",
      body: "Thanks — I've asked a teammate to join this chat. They'll reply here shortly.",
    });

    let ticketId = await getConversationTicket(id);
    if (!ticketId) {
      try {
        const transcript = await listMessages(id);
        const created = await handoffConversationToTicket(
          { id: org.id, name: org.name },
          {
            conversationId: id,
            pageUrl: conversation.pageUrl ?? null,
            messages: transcript.map((m) => ({ role: m.role, body: m.body })),
          },
        );
        ticketId = created.id;
      } catch {
        // Plan limit or transient failure: the team can still pick the chat up
        // from the Live chat inbox, so the visitor is never blocked.
        ticketId = null;
      }
    }

    const response = dataResponse({ message, ticketId }, 201);
    return withCors(response, request, org.chatAllowedOrigins);
  });
}
