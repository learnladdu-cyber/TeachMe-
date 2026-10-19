import { prisma } from "@/lib/db";
import { sanitizeMultiline, sanitizeSingleLine } from "@/lib/security/sanitize";

export async function listCannedResponses(organizationId: string) {
  return prisma.cannedResponse.findMany({
    where: { organizationId },
    orderBy: { title: "asc" },
    include: { createdBy: { select: { name: true } } },
  });
}

export async function createCannedResponse(
  organizationId: string,
  createdById: string,
  title: string,
  body: string,
) {
  return prisma.cannedResponse.create({
    data: {
      organizationId,
      createdById,
      title: sanitizeSingleLine(title, 120),
      body: sanitizeMultiline(body, 8000),
    },
  });
}

export async function updateCannedResponse(
  organizationId: string,
  id: string,
  title: string,
  body: string,
) {
  const existing = await prisma.cannedResponse.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Canned response not found");
  return prisma.cannedResponse.update({
    where: { id },
    data: { title: sanitizeSingleLine(title, 120), body: sanitizeMultiline(body, 8000) },
  });
}

export async function deleteCannedResponse(organizationId: string, id: string) {
  await prisma.cannedResponse.deleteMany({ where: { id, organizationId } });
}
