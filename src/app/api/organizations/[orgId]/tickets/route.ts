import { z } from "zod";
import { requireOrgMember } from "@/lib/auth";
import { ApiError, dataResponse, handle, notFound } from "@/lib/api";
import { createTicket, listTickets } from "@/lib/tickets";
import { assertJsonContentType, assertSameOrigin, readJson } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { isUuid } from "@/lib/security/sanitize";
import { longText, shortText } from "@/lib/validation/schemas";
import type { TicketStatus } from "@prisma/client";

const createSchema = z.object({
  subject: shortText(200),
  description: longText(10000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  channel: z.enum(["PORTAL", "EMAIL", "CHAT"]).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(["NEW", "OPEN", "PENDING", "ON_HOLD", "RESOLVED", "CLOSED"]).optional(),
  q: shortText(100, { min: 0 }).optional(),
  assigned: z.enum(["me"]).optional(),
});

// GET /organizations/:orgId/tickets — search/list tickets (org-scoped).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  return handle(async () => {
    const { orgId } = await params;
    if (!isUuid(orgId)) throw notFound();
    const { session, role } = await requireOrgMember(orgId);

    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      assigned: url.searchParams.get("assigned") ?? undefined,
    });
    if (!parsed.success) throw new ApiError(400, "invalid_input", "Invalid query parameters.");

    const tickets = await listTickets(orgId, session.user.id, role, {
      status: parsed.data.status as TicketStatus | undefined,
      q: parsed.data.q || undefined,
      assignedToMe: parsed.data.assigned === "me",
    });
    return dataResponse(tickets, 200, { count: tickets.length });
  });
}

// POST /organizations/:orgId/tickets — create a ticket.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  return handle(async () => {
    assertSameOrigin(request);
    assertJsonContentType(request);
    const { orgId } = await params;
    if (!isUuid(orgId)) throw notFound();
    const { session } = await requireOrgMember(orgId);

    enforceRateLimit(
      `tickets:create:${session.user.id}`,
      30,
      60_000,
      "You are creating tickets too quickly. Please slow down.",
    );

    const body = createSchema.parse(await readJson(request));
    const ticket = await createTicket(orgId, session.user.id, body);
    return dataResponse(ticket, 201);
  });
}
