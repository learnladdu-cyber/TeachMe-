import { prisma } from "@/lib/db";
import { LATEST_VERSION, LATEST_WIDGET_VERSION } from "@/lib/releases";

// Applies the latest platform release to a workspace: bumps the workspace
// version and brings the chat widget engine along with it. Keeps all data,
// settings and members — this is a bookkeeping upgrade, not a migration.
export async function applyWorkspaceUpdate(organizationId: string, actorId: string) {
  const before = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { appVersion: true },
  });

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: { appVersion: LATEST_VERSION, chatWidgetVersion: LATEST_WIDGET_VERSION },
    }),
    prisma.auditLog.create({
      data: {
        actorId,
        organizationId,
        action: "workspace.updated",
        targetType: "Organization",
        targetId: organizationId,
        reason: `appVersion ${before?.appVersion ?? "?"} -> ${LATEST_VERSION}`,
      },
    }),
  ]);

  return { from: before?.appVersion ?? null, to: LATEST_VERSION };
}
