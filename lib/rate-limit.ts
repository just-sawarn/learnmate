interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  capacity: number;
  refillPerSecond: number;
}

/** Per-process token bucket. Returns true when the call is allowed. */
export function allow(key: string, config: RateLimitConfig, now = Date.now()): boolean {
  const bucket = buckets.get(key) ?? { tokens: config.capacity, updatedAt: now };
  const elapsed = (now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(config.capacity, bucket.tokens + elapsed * config.refillPerSecond);
  bucket.updatedAt = now;
  const allowed = bucket.tokens >= 1;
  if (allowed) bucket.tokens -= 1;
  buckets.set(key, bucket);
  return allowed;
}

/** Per-user limits by route. Every name passed to authorize() must have an entry here. */
export const LIMITS = {
  tutor: { capacity: 20, refillPerSecond: 0.5 },
  assist: { capacity: 30, refillPerSecond: 1 },
  run: { capacity: 20, refillPerSecond: 0.5 },
  ingest: { capacity: 3, refillPerSecond: 1 / 60 },
  study: { capacity: 4, refillPerSecond: 1 / 20 },
  account: { capacity: 4, refillPerSecond: 1 / 30 },
  grade: { capacity: 20, refillPerSecond: 0.5 },
  light: { capacity: 60, refillPerSecond: 2 },
  narration: { capacity: 14, refillPerSecond: 1 / 10 },
} satisfies Record<string, RateLimitConfig>;

export function resetRateLimits(): void {
  buckets.clear();
}
