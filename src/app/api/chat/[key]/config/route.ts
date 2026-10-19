import { handle, dataResponse, notFound } from "@/lib/api";
import { getChatConfig, getOrgByChatKey } from "@/lib/chat/service";
import { chatKeySchema } from "@/lib/chat/validation";
import { preflight, withCors } from "@/lib/chat/transport";

const CORS_ANY = ["*"];

export async function OPTIONS(request: Request) {
  return preflight(request, CORS_ANY);
}

// GET /api/chat/:key/config — bootstrap payload for the embedded widget.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  return handle(async () => {
    const { key } = await params;
    const parsed = chatKeySchema.safeParse(key);
    if (!parsed.success) throw notFound();

    const org = await getOrgByChatKey(key);
    if (!org) throw notFound();

    const config = await getChatConfig(org.id);
    if (!config) throw notFound();

    const response = dataResponse({
      organizationName: config.organizationName,
      enabled: config.enabled,
      welcome: config.welcome,
      accent: config.accent,
      launcherLabel: config.launcherLabel,
      position: config.position,
    });
    return withCors(response, request, CORS_ANY);
  });
}
