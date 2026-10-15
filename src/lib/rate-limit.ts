/**
 * In-memory rate limiter (dev / mock).
 * Production: swap for Redis (REDIS_URL) with sliding-window counters.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

export function rateLimit(
  key: string,
  limit = Number(process.env.RATE_LIMIT_RPM ?? 60),
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt, limit };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt, limit };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    success: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
    limit,
  };
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
