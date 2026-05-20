/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding window counter. In production, swap to Upstash Ratelimit
 * for distributed rate limiting across Vercel edge functions.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key)
      }
    }
  }, 60_000)
}

interface RateLimitConfig {
  /** Maximum requests in the window */
  limit: number
  /** Window duration in seconds */
  windowSec: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given key (e.g., IP address or user ID).
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowSec * 1000 })
    return { allowed: true, remaining: config.limit - 1, resetAt: now + config.windowSec * 1000 }
  }

  if (entry.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt }
}

/** Presets for common endpoints */
export const RATE_LIMITS = {
  /** Auth endpoints: 10 requests per minute */
  auth: { limit: 10, windowSec: 60 },
  /** Submissions: 20 per minute */
  submission: { limit: 20, windowSec: 60 },
  /** General API: 60 per minute */
  api: { limit: 60, windowSec: 60 },
  /** Export: 5 per minute */
  export: { limit: 5, windowSec: 60 },
} as const
