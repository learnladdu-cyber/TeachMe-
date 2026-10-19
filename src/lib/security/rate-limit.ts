import { ApiError } from "@/lib/api";
import { pepper } from "@/lib/security/secret";

// In-memory sliding-window rate limiter.
//
// This protects a single application instance and is intentionally dependency
// free. For horizontally scaled deployments, back this with a shared store
// (e.g. Redis) so counters are consistent across instances.
const buckets = new Map<string, number[]>();
const MAX_KEYS = 50_000;

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

function prune(map: Map<string, number[]>, now: number, windowMs: number) {
  for (const [key, hits] of map) {
    const fresh = hits.filter((t) => now - t < windowMs);
    if (fresh.length === 0) map.delete(key);
    else map.set(key, fresh);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const namespaced = pepper(key).slice(0, 32);
  let hits = buckets.get(namespaced) ?? [];
  hits = hits.filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000));
    buckets.set(namespaced, hits);
    return { ok: false, limit, remaining: 0, retryAfterSeconds };
  }

  hits.push(now);
  buckets.set(namespaced, hits);

  if (buckets.size > MAX_KEYS) prune(buckets, now, windowMs);

  return { ok: true, limit, remaining: limit - hits.length, retryAfterSeconds: 0 };
}

export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  message = "Too many requests. Please try again later.",
): RateLimitResult {
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) {
    throw new ApiError(429, "rate_limited", message, undefined, {
      "Retry-After": String(result.retryAfterSeconds),
    });
  }
  return result;
}
