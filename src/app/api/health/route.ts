import { prisma } from "@/lib/db";
import { dataResponse, handle } from "@/lib/api";

export const dynamic = "force-dynamic";

const startedAt = Date.now();

// Liveness/readiness probe: verifies the database is reachable.
export async function GET() {
  return handle(async () => {
    let database = "down";
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "up";
    } catch {
      database = "down";
    }
    const status = database === "up" ? "ok" : "degraded";
    return dataResponse(
      {
        status,
        database,
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        time: new Date().toISOString(),
      },
      status === "ok" ? 200 : 503,
    );
  });
}
