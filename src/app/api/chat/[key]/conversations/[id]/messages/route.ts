import { dataResponse, handle } from "@/lib/api";
import { assertJsonContentType, readJson } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { preflight, withCors } from "@/lib/chat/transport";
import { requireChatOrg, requireVisitorConversation } from "@/lib/chat/guard";
import { addMessage, getPublishedDocs } from "@/lib/chat/service";
import { generateBotReply } from "@/lib/chat/engine";
import { visitorMessageSchema } from "@/lib/chat/validation";

export async function OPTIONS(request: Request) {
  return preflight(request, ["*"]);
}

// POST /api/chat/:key/conversations/:id/messages — visitor sends a message and
// receives the docs-grounded bot reply.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string; id: string }> },
) {
  return handle(async () => {
    assertJsonContentType(request);
    const { key, id } = await params;
    const org = await requireChatOrg(key);
    const body = visitorMessageSchema.parse(await readJson(request));

    await requireVisitorConversation(org.id, id, body.visitorId);

    enforceRateLimit(
      `chat:msg:${org.id}:${body.visitorId}`,
      20,
      60_000,
      "You are sending messages too quickly.",
    );

    const visitorMessage = await addMessage(org.id, id, {
      role: "VISITOR",
      body: body.body,
    });

    const docs = await getPublishedDocs(org.id);
    const reply = await generateBotReply(body.body, docs);

    const botMessage = await addMessage(org.id, id, {
      role: "BOT",
      body: reply.body,
      articleId: reply.article?.id ?? null,
      articleTitle: reply.article?.title ?? null,
    });

    const response = dataResponse(
      { messages: [visitorMessage, botMessage], handoff: reply.handoff },
      201,
    );
    return withCors(response, request, org.chatAllowedOrigins);
  });
}
