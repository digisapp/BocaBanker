import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ── Upstash client (only initialised when env vars are present) ────

let _redis: Redis | null = null;
const _ratelimit: Map<string, Ratelimit> = new Map();
let warnedInMemoryFallback = false;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

function getUpstashLimiter(maxRequests: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const key = `${maxRequests}:${windowMs}`;
  if (_ratelimit.has(key)) return _ratelimit.get(key)!;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs / 1000} s`),
    analytics: true,
  });
  _ratelimit.set(key, limiter);
  return limiter;
}

// ── In-memory fallback ─────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanupStore() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [k, entry] of store) {
    if (now > entry.resetTime) store.delete(k);
  }
}

function inMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { success: boolean; remaining: number; resetTime: number } {
  cleanupStore();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { success: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}

// ── Public API ─────────────────────────────────────────────────────

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

export async function rateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(config.maxRequests, config.windowMs);

  if (upstash) {
    const result = await upstash.limit(key);
    return {
      success: result.success,
      remaining: result.remaining,
      resetTime: result.reset,
    };
  }

  // Fallback to in-memory (single-instance only). On serverless this is
  // per-lambda and trivially bypassed — Upstash must be configured in prod.
  if (process.env.NODE_ENV === 'production' && !warnedInMemoryFallback) {
    warnedInMemoryFallback = true;
    console.warn(
      '[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to per-instance in-memory rate limiting, which is ineffective on serverless. Configure Upstash in production.',
    );
  }
  return inMemoryRateLimit(key, config.maxRequests, config.windowMs);
}

// ── Daily counters ─────────────────────────────────────────────────
// A cap that is checked without being spent (e.g. "is today's voice call cap
// used up?") and spent only when the metered thing actually happens.

const DAY_TTL_S = 2 * 24 * 60 * 60;
const memoryCounters = new Map<string, number>();

function counterKey(name: string, day: string): string {
  return `counter:${name}:${day}`;
}

/** Current value of a per-day counter (`day` is any stable day label). */
export async function readDailyCounter(name: string, day: string): Promise<number> {
  const redis = getRedis();
  const key = counterKey(name, day);
  if (!redis) return memoryCounters.get(key) ?? 0;
  return Number((await redis.get<number>(key)) ?? 0);
}

/** Add one to a per-day counter unless it has reached `cap`. True when counted. */
export async function claimDailyCounter(name: string, day: string, cap: number): Promise<boolean> {
  const redis = getRedis();
  const key = counterKey(name, day);
  if (!redis) {
    const count = memoryCounters.get(key) ?? 0;
    if (count >= cap) return false;
    memoryCounters.set(key, count + 1);
    return true;
  }
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, DAY_TTL_S);
  if (count > cap) {
    // Over the cap: give the slot back so the count stays exact
    await redis.decr(key);
    return false;
  }
  return true;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
