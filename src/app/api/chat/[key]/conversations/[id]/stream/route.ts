import { handle, notFound } from "@/lib/api";
import { chatBus } from "@/lib/chat/bus";
import { requireChatOrg, requireVisitorConversation } from "@/lib/chat/guard";
import { sseResponse } from "@/lib/chat/transport";
import { visitorIdSchema } from "@/lib/chat/validation";

// GET /api/chat/:key/conversations/:id/stream?visitorId= — live message push.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string; id: string }> },
) {
  return handle(async () => {
    const { key, id } = await params;
    const org = await requireChatOrg(key);

    const visitorId = visitorIdSchema.safeParse(
      new URL(request.url).searchParams.get("visitorId"),
    );
    if (!visitorId.success) throw notFound();

    await requireVisitorConversation(org.id, id, visitorId.data);

    return sseResponse(request, (send) =>
      chatBus.subscribe(`conversation:${id}`, (event) => {
        if (event.type === "message") send("message", event.message);
      }),
    );
  });
}
