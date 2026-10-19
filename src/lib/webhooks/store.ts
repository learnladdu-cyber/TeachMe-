import { prisma } from "@/lib/db";
import { encryptSecrets } from "@/lib/security/secrets";
import { isDeliverableUrl } from "@/lib/webhooks/dispatch";

export async function listEndpoints(organizationId: string) {
  return prisma.webhookEndpoint.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      deliveries: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { deliveries: true } },
    },
  });
}

export async function listDeliveries(organizationId: string, limit = 50) {
  return prisma.webhookDelivery.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { endpoint: { select: { url: true } } },
  });
}

export async function createEndpoint(input: {
  organizationId: string;
  createdById: string;
  url: string;
  secret?: string;
  events: string[];
}) {
  if (!isDeliverableUrl(input.url)) throw new Error("That URL is not allowed.");
  return prisma.webhookEndpoint.create({
    data: {
      organizationId: input.organizationId,
      createdById: input.createdById,
      url: input.url.trim(),
      secret: input.secret ? encryptSecrets({ secret: input.secret }) : null,
      events: input.events,
    },
  });
}

export async function setEndpointEnabled(organizationId: string, id: string, enabled: boolean) {
  await prisma.webhookEndpoint.updateMany({ where: { id, organizationId }, data: { enabled } });
}

export async function deleteEndpoint(organizationId: string, id: string) {
  await prisma.webhookEndpoint.deleteMany({ where: { id, organizationId } });
}
