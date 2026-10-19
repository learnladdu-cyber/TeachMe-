import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { dataResponse, forbidden, handle } from "@/lib/api";

// GET /admin/organizations — platform admin only (cross-tenant, audited).
export async function GET() {
  return handle(async () => {
    const session = await requireSession();
    if (!session.user.isPlatformAdmin) throw forbidden();

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { name: true } },
        _count: { select: { members: true, tickets: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        organizationId: null,
        action: "admin.organizations.list",
        targetType: "organization",
        reason: "platform overview",
      },
    });

    return dataResponse(
      organizations.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        status: o.status,
        plan: o.plan?.name ?? null,
        members: o._count.members,
        tickets: o._count.tickets,
        createdAt: o.createdAt,
      })),
      200,
      { count: organizations.length },
    );
  });
}
