import { requireOrgMember } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { exportOrganizationData } from "@/lib/export";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

// GET /api/organizations/:orgId/export — full workspace data export (admins).
export async function GET(_request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    if (!isUuid(orgId)) {
      return Response.json({ error: { code: "not_found", message: "Unknown workspace." } }, { status: 404 });
    }
    await requireOrgMember(orgId, "ORG_ADMIN");

    const data = await exportOrganizationData(orgId);
    await prisma.auditLog
      .create({
        data: {
          organizationId: orgId,
          action: "privacy.export",
          targetType: "Organization",
          targetId: orgId,
        },
      })
      .catch(() => {});

    const filename = `helpdeskflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
