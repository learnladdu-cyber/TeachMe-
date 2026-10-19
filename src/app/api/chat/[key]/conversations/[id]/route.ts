import { dataResponse, handle, notFound } from "@/lib/api";
import { preflight, withCors } from "@/lib/chat/transport";
import { requireChatOrg, requireVisitorConversation } from "@/lib/chat/guard";
import { listMessages } from "@/lib/chat/service";
import { visitorIdSchema } from "@/lib/chat/validation";

export async function OPTIONS(request: Request) {
  return preflight(request, ["*"]);
}

// GET /api/chat/:key/conversations/:id?visitorId=&after= — poll messages.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string; id: string }> },
) {
  return handle(async () => {
    const { key, id } = await params;
    const org = await requireChatOrg(key);

    const url = new URL(request.url);
    const visitorId = visitorIdSchema.safeParse(url.searchParams.get("visitorId"));
    if (!visitorId.success) throw notFound();

    await requireVisitorConversation(org.id, id, visitorId.data);

    const afterRaw = url.searchParams.get("after");
    let after: Date | undefined;
    if (afterRaw) {
      const parsed = new Date(afterRaw);
      if (!Number.isNaN(parsed.getTime())) after = parsed;
    }

    const messages = await listMessages(id, after);
    const response = dataResponse(messages, 200, { count: messages.length });
    return withCors(response, request, org.chatAllowedOrigins);
  });
}
