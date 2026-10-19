import { ApiError } from "@/lib/api";

// Protects cron/job endpoints. Requires CRON_SECRET to be set and matched via
// `Authorization: Bearer <secret>` or `x-cron-secret`.
export function assertCron(request: Request): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new ApiError(503, "cron_disabled", "CRON_SECRET is not configured.");
  }
  const header = request.headers.get("authorization");
  const provided = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : request.headers.get("x-cron-secret");
  if (provided !== secret) {
    throw new ApiError(401, "unauthorized", "Invalid cron credentials.");
  }
}
