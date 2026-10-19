import { dataResponse, handle } from "@/lib/api";
import { assertCron } from "@/lib/cron";
import { retryFailedDeliveries } from "@/lib/webhooks/dispatch";

export const dynamic = "force-dynamic";

// POST /api/cron/webhooks — retries failed outbound webhook deliveries.
export async function POST(request: Request) {
  return handle(async () => {
    assertCron(request);
    const delivered = await retryFailedDeliveries();
    return dataResponse({ delivered });
  });
}
