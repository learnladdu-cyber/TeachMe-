import { z } from "zod";
import { isStaff, requireOrgMember } from "@/lib/auth";
import { ApiError, dataResponse, handle, notFound } from "@/lib/api";
import { addMessage } from "@/lib/tickets";
import { assertJsonContentType, assertSameOrigin, readJson } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { isUuid } from "@/lib/security/sanitize";
import { longText } from "@/lib/validation/schemas";

const bodySchema = z.object({
  body: longText(10000),
  visibility: z.enum(["PUBLIC", "INTERNAL"]).default("PUBLIC"),
});

// POST /organizations/:orgId/tickets/:ticketId/messages — public reply or internal note.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; ticketId: string }> },
) {
  return handle(async () => {
    assertSameOrigin(request);
    assertJsonContentType(request);
    const { orgId, ticketId } = await params;
    if (!isUuid(orgId) || !isUuid(ticketId)) throw notFound();
    const { session, role } = await requireOrgMember(orgId);

    enforceRateLimit(
      `messages:create:${session.user.id}`,
      60,
      60_000,
      "You are sending messages too quickly. Please slow down.",
    );

    const body = bodySchema.parse(await readJson(request));

    if (body.visibility === "INTERNAL" && !isStaff(role)) {
      throw new ApiError(403, "forbidden", "Internal notes require an agent role.");
    }

    const message = await addMessage(
      orgId,
      session.user.id,
      role,
      ticketId,
      body.body,
      body.visibility,
    );
    return dataResponse(message, 201);
  });
}
