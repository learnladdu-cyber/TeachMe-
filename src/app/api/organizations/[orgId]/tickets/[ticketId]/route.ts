import { z } from "zod";
import { requireOrgMember } from "@/lib/auth";
import { ApiError, dataResponse, handle, notFound } from "@/lib/api";
import { getTicketForUser, updateTicket } from "@/lib/tickets";
import { assertJsonContentType, assertSameOrigin, readJson } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { isUuid } from "@/lib/security/sanitize";

const patchSchema = z.object({
  status: z.enum(["NEW", "OPEN", "PENDING", "ON_HOLD", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

// GET /organizations/:orgId/tickets/:ticketId
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; ticketId: string }> },
) {
  return handle(async () => {
    const { orgId, ticketId } = await params;
    if (!isUuid(orgId) || !isUuid(ticketId)) throw notFound();
    const { session, role } = await requireOrgMember(orgId);
    const ticket = await getTicketForUser(orgId, session.user.id, role, ticketId);
    return dataResponse(ticket);
  });
}

// PATCH /organizations/:orgId/tickets/:ticketId — staff only, transition map enforced.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; ticketId: string }> },
) {
  return handle(async () => {
    assertSameOrigin(request);
    assertJsonContentType(request);
    const { orgId, ticketId } = await params;
    if (!isUuid(orgId) || !isUuid(ticketId)) throw notFound();
    const { session, role } = await requireOrgMember(orgId, "AGENT");

    enforceRateLimit(
      `tickets:update:${session.user.id}`,
      120,
      60_000,
      "Too many updates. Please slow down.",
    );

    const body = patchSchema.parse(await readJson(request));
    try {
      const ticket = await updateTicket(orgId, session.user.id, role, ticketId, body);
      return dataResponse(ticket);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Invalid transition")) {
        throw new ApiError(409, "invalid_transition", e.message);
      }
      throw e;
    }
  });
}
