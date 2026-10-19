import { prisma } from "@/lib/db";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export type CreateAttachmentInput = {
  organizationId: string;
  ticketId?: string | null;
  articleId?: string | null;
  filename: string;
  contentType: string;
  data: Uint8Array;
  uploadedById?: string | null;
};

export function validateAttachment(contentType: string, size: number): string | null {
  if (size <= 0) return "File is empty.";
  if (size > MAX_ATTACHMENT_BYTES) return `File exceeds the ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB limit.`;
  if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) return "This file type is not allowed.";
  return null;
}

export async function createAttachment(input: CreateAttachmentInput) {
  return prisma.attachment.create({
    data: {
      organizationId: input.organizationId,
      ticketId: input.ticketId ?? null,
      articleId: input.articleId ?? null,
      filename: input.filename.slice(0, 200),
      contentType: input.contentType,
      size: input.data.byteLength,
      data: Buffer.from(input.data),
      uploadedById: input.uploadedById ?? null,
    },
    select: { id: true, filename: true, contentType: true, size: true, createdAt: true },
  });
}

export async function listTicketAttachments(organizationId: string, ticketId: string) {
  return prisma.attachment.findMany({
    where: { organizationId, ticketId },
    orderBy: { createdAt: "asc" },
    select: { id: true, filename: true, contentType: true, size: true, createdAt: true },
  });
}

export async function getAttachment(organizationId: string, id: string) {
  return prisma.attachment.findFirst({ where: { id, organizationId } });
}
