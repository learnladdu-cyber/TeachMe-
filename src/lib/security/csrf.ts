import { ApiError } from "@/lib/api";
import { hasDangerousKeys } from "@/lib/security/sanitize";

function allowedOrigins(request: Request): string[] {
  const origins = new Set<string>();
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // ignore malformed APP_URL
    }
  }
  const host = request.headers.get("host");
  if (host) {
    origins.add(`https://${host}`);
    origins.add(`http://${host}`);
  }
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) origins.add(`${proto}://${host}`);
  return [...origins];
}

// Blocks cross-site browser requests to state-changing endpoints. SameSite=Lax
// cookies already defend against CSRF; this is defence in depth and also
// covers non-cookie credential leakage.
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return; // native/API clients may omit Origin
  const allowed = allowedOrigins(request);
  if (!allowed.includes(origin)) {
    throw new ApiError(403, "forbidden_origin", "Request origin is not allowed.");
  }
}

export function assertJsonContentType(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Content-Type must be application/json.");
  }
}

const MAX_BODY_BYTES = 100 * 1024;

export async function readJson<T>(request: Request): Promise<T> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) {
    throw new ApiError(413, "payload_too_large", "Request body is too large.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new ApiError(413, "payload_too_large", "Request body is too large.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  if (hasDangerousKeys(parsed)) {
    throw new ApiError(400, "invalid_input", "Request body contains disallowed keys.");
  }
  return parsed as T;
}
