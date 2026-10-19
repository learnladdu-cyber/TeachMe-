import { forbidden, notFound } from "@/lib/api";
import { getConversationForVisitor, getOrgByChatKey } from "@/lib/chat/service";
import { chatKeySchema, conversationIdSchema, visitorIdSchema } from "@/lib/chat/validation";

export type ChatOrg = NonNullable<Awaited<ReturnType<typeof getOrgByChatKey>>>;

// Resolves a public widget key to an organization, enforcing key shape and the
// organization's toggle. Not-found and disabled collapse to prevent key probing.
export async function requireChatOrg(key: string): Promise<ChatOrg> {
  const parsed = chatKeySchema.safeParse(key);
  if (!parsed.success) throw notFound();
  const org = await getOrgByChatKey(key);
  if (!org) throw notFound();
  if (!org.chatEnabled) throw forbidden();
  return org;
}

// Loads a conversation and confirms it belongs to both the organization behind
// the widget key and the visitor (tenant + owner isolation).
export async function requireVisitorConversation(
  organizationId: string,
  conversationId: string,
  visitorId: string,
) {
  if (!conversationIdSchema.safeParse(conversationId).success) throw notFound();
  if (!visitorIdSchema.safeParse(visitorId).success) throw notFound();
  const conversation = await getConversationForVisitor(conversationId, visitorId);
  if (!conversation || conversation.organizationId !== organizationId) throw notFound();
  return conversation;
}
