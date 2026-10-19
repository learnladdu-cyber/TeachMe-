import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { sanitizeMultiline, sanitizeSingleLine } from "@/lib/security/sanitize";
import { normalizeEmail } from "@/lib/security/sanitize";
import { chatBus } from "@/lib/chat/bus";

export const CHAT_MESSAGE_MAX = 4000;

export type ChatMessageDTO = {
  id: string;
  role: "VISITOR" | "BOT" | "AGENT";
  body: string;
  articleTitle: string | null;
  createdAt: string;
};

export type ChatConfigDTO = {
  organizationId: string;
  organizationName: string;
  enabled: boolean;
  welcome: string;
  accent: string;
  launcherLabel: string;
  position: "left" | "right";
};

export type StaffConversationDTO = {
  id: string;
  visitorName: string | null;
  visitorEmail: string | null;
  pageUrl: string | null;
  status: "OPEN" | "CLOSED";
  unreadForStaff: number;
  lastMessageAt: string;
  createdAt: string;
  preview: string | null;
  messageCount: number;
};

export function newChatKey(): string {
  return randomUUID().replace(/-/g, "").slice(0, 24);
}

export async function ensureChatKey(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { chatKey: true },
  });
  if (org?.chatKey) return org.chatKey;
  const key = newChatKey();
  await prisma.organization.update({ where: { id: organizationId }, data: { chatKey: key } });
  return key;
}

export async function getOrgByChatKey(key: string) {
  if (!key || key.length < 8 || key.length > 64) return null;
  return prisma.organization.findUnique({
    where: { chatKey: key },
    select: {
      id: true,
      name: true,
      slug: true,
      chatEnabled: true,
      chatWelcome: true,
      chatAccent: true,
      chatLauncherLabel: true,
      chatPosition: true,
      chatAllowedOrigins: true,
    },
  });
}

export async function getChatConfig(organizationId: string): Promise<ChatConfigDTO | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      chatEnabled: true,
      chatWelcome: true,
      chatAccent: true,
      chatLauncherLabel: true,
      chatPosition: true,
    },
  });
  if (!org) return null;
  return {
    organizationId: org.id,
    organizationName: org.name,
    enabled: org.chatEnabled,
    welcome: org.chatWelcome,
    accent: org.chatAccent,
    launcherLabel: org.chatLauncherLabel,
    position: org.chatPosition === "left" ? "left" : "right",
  };
}

export async function getPublishedDocs(organizationId: string) {
  return prisma.knowledgeArticle.findMany({
    where: { organizationId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, body: true, category: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function createConversation(
  organizationId: string,
  input: { visitorId: string; visitorName?: string; visitorEmail?: string; pageUrl?: string },
) {
  return prisma.chatConversation.create({
    data: {
      organizationId,
      visitorId: sanitizeSingleLine(input.visitorId, 64),
      visitorName: input.visitorName ? sanitizeSingleLine(input.visitorName, 120) : null,
      visitorEmail: input.visitorEmail ? normalizeEmail(input.visitorEmail) || null : null,
      pageUrl: input.pageUrl ? sanitizeSingleLine(input.pageUrl, 500) : null,
    },
    select: { id: true, status: true, createdAt: true },
  });
}

export async function getConversationForOrg(conversationId: string, organizationId: string) {
  return prisma.chatConversation.findFirst({ where: { id: conversationId, organizationId } });
}

export async function findOpenConversation(organizationId: string, visitorId: string) {
  return prisma.chatConversation.findFirst({
    where: {
      organizationId,
      visitorId: sanitizeSingleLine(visitorId, 64),
      status: "OPEN",
      lastMessageAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { lastMessageAt: "desc" },
    select: { id: true },
  });
}

export async function getConversationForVisitor(conversationId: string, visitorId: string) {
  return prisma.chatConversation.findFirst({
    where: { id: conversationId, visitorId: sanitizeSingleLine(visitorId, 64) },
  });
}

function toMessageDTO(m: {
  id: string;
  role: "VISITOR" | "BOT" | "AGENT";
  body: string;
  articleTitle: string | null;
  createdAt: Date;
}): ChatMessageDTO {
  return {
    id: m.id,
    role: m.role,
    body: m.body,
    articleTitle: m.articleTitle,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function listMessages(
  conversationId: string,
  after?: Date,
): Promise<ChatMessageDTO[]> {
  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      ...(after ? { createdAt: { gt: after } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: { id: true, role: true, body: true, articleTitle: true, createdAt: true },
  });
  return messages.map(toMessageDTO);
}

export async function addMessage(
  organizationId: string,
  conversationId: string,
  input: {
    role: "VISITOR" | "BOT" | "AGENT";
    body: string;
    agentId?: string | null;
    articleId?: string | null;
    articleTitle?: string | null;
  },
): Promise<ChatMessageDTO> {
  const body = sanitizeMultiline(input.body, CHAT_MESSAGE_MAX);
  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        organizationId,
        conversationId,
        role: input.role,
        body,
        agentId: input.agentId ?? null,
        articleId: input.articleId ?? null,
        articleTitle: input.articleTitle ?? null,
      },
      select: { id: true, role: true, body: true, articleTitle: true, createdAt: true },
    }),
    prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        ...(input.role === "VISITOR" ? { unreadForStaff: { increment: 1 } } : {}),
      },
    }),
  ]);

  const dto = toMessageDTO(message);
  chatBus.publish(`conversation:${conversationId}`, {
    type: "message",
    conversationId,
    organizationId,
    message: dto,
  });
  chatBus.publish(`org:${organizationId}`, {
    type: "conversation",
    conversationId,
    organizationId,
  });
  return dto;
}

export async function listConversations(organizationId: string): Promise<StaffConversationDTO[]> {
  const conversations = await prisma.chatConversation.findMany({
    where: { organizationId },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true },
      },
      _count: { select: { messages: true } },
    },
  });

  return conversations.map((c) => ({
    id: c.id,
    visitorName: c.visitorName,
    visitorEmail: c.visitorEmail,
    pageUrl: c.pageUrl,
    status: c.status,
    unreadForStaff: c.unreadForStaff,
    lastMessageAt: c.lastMessageAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    preview: c.messages[0]?.body ?? null,
    messageCount: c._count.messages,
  }));
}

export async function markConversationRead(organizationId: string, conversationId: string) {
  await prisma.chatConversation.updateMany({
    where: { id: conversationId, organizationId },
    data: { unreadForStaff: 0 },
  });
}

export async function setConversationStatus(
  organizationId: string,
  conversationId: string,
  status: "OPEN" | "CLOSED",
) {
  await prisma.chatConversation.updateMany({
    where: { id: conversationId, organizationId },
    data: { status },
  });
}

export async function updateWidgetConfig(
  organizationId: string,
  input: {
    enabled: boolean;
    welcome: string;
    accent: string;
    launcherLabel: string;
    position: "left" | "right";
    allowedOrigins: string[];
  },
) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      chatEnabled: input.enabled,
      chatWelcome: sanitizeSingleLine(input.welcome, 240),
      chatAccent: input.accent,
      chatLauncherLabel: sanitizeSingleLine(input.launcherLabel, 60) || "Chat with us",
      chatPosition: input.position,
      chatAllowedOrigins: input.allowedOrigins,
    },
  });
}

// ---------------------------------------------------------------------------
// Chat -> ticket handoff
// ---------------------------------------------------------------------------

// Guest visitors are not workspace users, but tickets require a requester User.
// We reuse a single synthetic "Website visitor" account per organization so the
// chat ticket flows through the normal SLA / automation / reporting pipeline
// without cluttering the member list.
function guestEmail(organizationId: string): string {
  return `chat-visitor+${organizationId}@chat.invalid`;
}

async function ensureGuestRequester(organizationId: string) {
  const email = guestEmail(organizationId);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const membership = await prisma.membership.findFirst({
      where: { userId: existing.id, organizationId },
      select: { id: true },
    });
    if (!membership) {
      await prisma.membership.create({
        data: { userId: existing.id, organizationId, role: "CUSTOMER", status: "ACTIVE" },
      });
    }
    return existing.id;
  }

  const created = await prisma.user.create({
    data: {
      email,
      name: "Website visitor",
      // Not a valid password hash, so this synthetic account can never sign in.
      passwordHash: `chat-locked:${randomUUID()}`,
      emailVerifiedAt: null,
      memberships: {
        create: { organizationId, role: "CUSTOMER", status: "ACTIVE" },
      },
    },
    select: { id: true },
  });
  return created.id;
}

// Creates a ticket from a handed-off chat conversation, copying the transcript
// in as public messages and recording the page the visitor was on. Idempotent:
// returns the existing ticket id if the conversation is already linked.
export async function handoffConversationToTicket(
  organization: { id: string; name: string },
  input: {
    conversationId: string;
    pageUrl: string | null;
    messages: { role: string; body: string }[];
  },
) {
  const { createTicket } = await import("@/lib/tickets");

  const requesterId = await ensureGuestRequester(organization.id);

  const firstVisitor = input.messages.find((m) => m.role === "VISITOR");
  const subject = (firstVisitor?.body ?? "Website chat").slice(0, 120) || "Website chat";
  const transcript = input.messages
    .map((m) => `${m.role === "VISITOR" ? "Visitor" : m.role === "AGENT" ? "Agent" : "Assistant"}: ${m.body}`)
    .join("\n\n");
  const description =
    `Website chat transcript\n` +
    (input.pageUrl ? `Page: ${input.pageUrl}\n\n` : "\n") +
    transcript;

  const ticket = await createTicket(organization.id, requesterId, {
    subject,
    description: description.slice(0, 20000),
    priority: "NORMAL",
    channel: "CHAT",
  });

  await prisma.chatConversation.update({
    where: { id: input.conversationId },
    data: { ticketId: ticket.id },
  });

  return ticket;
}

export async function getConversationTicket(conversationId: string) {
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: { ticketId: true },
  });
  return conversation?.ticketId ?? null;
}
