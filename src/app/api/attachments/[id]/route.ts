import { prisma } from "@/lib/db";
import { handle, notFound } from "@/lib/api";
import { isStaff, requireOrgMember } from "@/lib/auth";
import { isUuid } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

// GET /api/attachments/:id — streams an attachment (org-scoped).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    if (!isUuid(id)) throw notFound();

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: { ticket: { select: { requesterId: true } } },
    });
    if (!attachment) throw notFound();

    const { session, role } = await requireOrgMember(attachment.organizationId);
    if (!isStaff(role) && attachment.ticket?.requesterId !== session.user.id) {
      throw notFound();
    }

    const filename = attachment.filename.replace(/["\r\n]/g, "");
    return new Response(new Uint8Array(attachment.data), {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Length": String(attachment.size),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
