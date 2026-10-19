import { pepper } from "@/lib/security/secret";

export type ClientMeta = {
  ip: string;
  ipHash: string;
  userAgent: string;
  uaHash: string;
};

export function clientMetaFromHeaders(headers: Headers): ClientMeta {
  const forwarded = headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown";
  const userAgent = (headers.get("user-agent") ?? "unknown").slice(0, 300);
  return {
    ip,
    ipHash: pepper(`ip:${ip}`),
    userAgent,
    uaHash: pepper(`ua:${userAgent}`),
  };
}

export function clientMetaFromRequest(request: Request): ClientMeta {
  return clientMetaFromHeaders(request.headers);
}

// Server actions have no Request object; this reads the ambient request headers.
export async function clientMetaFromNextHeaders(): Promise<ClientMeta> {
  const { headers } = await import("next/headers");
  return clientMetaFromHeaders(await headers());
}
