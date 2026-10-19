import { requireOrgMember, isStaff } from "@/lib/auth";
import { ApiError, dataResponse, handle, notFound } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createAttachment, validateAttachment, MAX_ATTACHMENT_BYTES } from "@/lib/attachments";
import { assertSameOrigin } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { isUuid } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

// POST /organizations/:orgId/attachments — multipart upload for a ticket.
export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const { orgId } = await params;
    if (!isUuid(orgId)) throw notFound();
    const { session, role } = await requireOrgMember(orgId);

    enforceRateLimit(`attachments:${session.user.id}`, 30, 60_000, "Too many uploads. Please slow down.");

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_ATTACHMENT_BYTES + 64 * 1024) {
      throw new ApiError(413, "too_large", "File exceeds the upload limit.");
    }

    const form = await request.formData();
    const file = form.get("file");
    const ticketId = String(form.get("ticketId") ?? "");
    if (!(file instanceof File)) throw new ApiError(400, "missing_file", "No file was provided.");
    if (!isUuid(ticketId)) throw new ApiError(400, "invalid_ticket", "A valid ticket is required.");

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, organizationId: orgId },
      select: { requesterId: true },
    });
    if (!ticket) throw notFound();
    if (!isStaff(role) && ticket.requesterId !== session.user.id) throw notFound();

    const invalid = validateAttachment(file.type, file.size);
    if (invalid) throw new ApiError(400, "invalid_file", invalid);

    const attachment = await createAttachment({
      organizationId: orgId,
      ticketId,
      filename: file.name,
      contentType: file.type,
      data: new Uint8Array(await file.arrayBuffer()),
      uploadedById: session.user.id,
    });

    return dataResponse(attachment, 201);
  });
}
