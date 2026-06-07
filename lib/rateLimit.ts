/**
 * In-memory IP-based sliding-window rate limiter.
 *
 * Interface is intentionally compatible with an Upstash Redis swap:
 * replace this module's internals with Upstash Ratelimit calls and the
 * route handler requires zero changes.
 *
 * Default: 10 requests per 60 seconds per IP.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX ?? "10", 10);

// Periodically purge expired entries to avoid unbounded memory growth.
// Only runs in long-lived server processes; harmless in serverless.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store.entries()) {
      if (now > win.resetAt) store.delete(key);
    }
  }, WINDOW_MS * 2);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  // Skip rate limiting when the IP is indeterminate — all "unknown" requests
  // would otherwise share one bucket and block each other collectively.
  if (ip === "unknown") {
    return { allowed: true, remaining: MAX_REQUESTS, resetAt: Date.now() + WINDOW_MS };
  }

  const now = Date.now();
  let win = store.get(ip);

  if (!win || now > win.resetAt) {
    win = { count: 0, resetAt: now + WINDOW_MS };
    store.set(ip, win);
  }

  win.count += 1;
  const allowed = win.count <= MAX_REQUESTS;
  const remaining = Math.max(0, MAX_REQUESTS - win.count);

  return { allowed, remaining, resetAt: win.resetAt };
}
