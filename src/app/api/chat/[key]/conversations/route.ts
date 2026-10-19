import { dataResponse, handle } from "@/lib/api";
import { assertJsonContentType, readJson } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { clientMetaFromRequest } from "@/lib/security/request";
import { preflight, withCors } from "@/lib/chat/transport";
import { requireChatOrg } from "@/lib/chat/guard";
import {
  addMessage,
  createConversation,
  findOpenConversation,
  listMessages,
} from "@/lib/chat/service";
import { startConversationSchema } from "@/lib/chat/validation";

export async function OPTIONS(request: Request) {
  return preflight(request, ["*"]);
}

// POST /api/chat/:key/conversations — start (or resume) a visitor conversation.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  return handle(async () => {
    assertJsonContentType(request);
    const { key } = await params;
    const org = await requireChatOrg(key);
    const meta = clientMetaFromRequest(request);

    enforceRateLimit(
      `chat:start:${org.id}:${meta.ipHash}`,
      20,
      60_000,
      "Too many conversations started. Please try again shortly.",
    );

    const body = startConversationSchema.parse(await readJson(request));

    const existing = await findOpenConversation(org.id, body.visitorId);
    if (existing) {
      const messages = await listMessages(existing.id);
      const response = dataResponse({ conversationId: existing.id, messages });
      return withCors(response, request, org.chatAllowedOrigins);
    }

    const conversation = await createConversation(org.id, {
      visitorId: body.visitorId,
      visitorName: body.visitorName,
      visitorEmail: body.visitorEmail || undefined,
      pageUrl: body.pageUrl || undefined,
    });

    await addMessage(org.id, conversation.id, { role: "BOT", body: org.chatWelcome });
    const messages = await listMessages(conversation.id);

    const response = dataResponse({ conversationId: conversation.id, messages }, 201);
    return withCors(response, request, org.chatAllowedOrigins);
  });
}
