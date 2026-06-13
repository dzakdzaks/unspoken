import { describe, it, expect, vi, beforeEach } from "vitest";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows requests within the limit", async () => {
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "3";
    const { checkRateLimit } = await import("@/lib/rateLimit");

    expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
    expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
    expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
  });

  it("blocks requests exceeding the limit", async () => {
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "2";
    const { checkRateLimit } = await import("@/lib/rateLimit");

    expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
    expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
    expect(checkRateLimit("1.2.3.4").allowed).toBe(false);
  });

  it("reports remaining count correctly", async () => {
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "5";
    const { checkRateLimit } = await import("@/lib/rateLimit");

    expect(checkRateLimit("1.2.3.4").remaining).toBe(4);
    expect(checkRateLimit("1.2.3.4").remaining).toBe(3);
    expect(checkRateLimit("1.2.3.4").remaining).toBe(2);
    expect(checkRateLimit("1.2.3.4").remaining).toBe(1);
    expect(checkRateLimit("1.2.3.4").remaining).toBe(0);
    expect(checkRateLimit("1.2.3.4").remaining).toBe(0);
  });

  it("resets window after expiry", async () => {
    vi.useFakeTimers();
    process.env.RATE_LIMIT_WINDOW_MS = "1000";
    process.env.RATE_LIMIT_MAX = "2";
    const { checkRateLimit } = await import("@/lib/rateLimit");

    // Use up the limit
    expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
    expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
    expect(checkRateLimit("1.2.3.4").allowed).toBe(false);

    // Advance time past window expiry
    vi.advanceTimersByTime(1001);

    // Should be allowed again
    expect(checkRateLimit("1.2.3.4").allowed).toBe(true);

    vi.useRealTimers();
  });

  it("treats different IPs independently", async () => {
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "1";
    const { checkRateLimit } = await import("@/lib/rateLimit");

    expect(checkRateLimit("1.1.1.1").allowed).toBe(true);
    expect(checkRateLimit("1.1.1.1").allowed).toBe(false);

    expect(checkRateLimit("2.2.2.2").allowed).toBe(true);
    expect(checkRateLimit("2.2.2.2").allowed).toBe(false);
  });

  it("always allows unknown IPs", async () => {
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "2";
    const { checkRateLimit } = await import("@/lib/rateLimit");

    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit("unknown").allowed).toBe(true);
    }
  });

  it("returns resetAt in the future", async () => {
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "3";
    const { checkRateLimit } = await import("@/lib/rateLimit");

    const now = Date.now();
    const result = checkRateLimit("1.2.3.4");
    expect(result.resetAt).toBeGreaterThanOrEqual(now + 60000 - 5);
    expect(result.resetAt).toBeLessThanOrEqual(now + 60000 + 5);
  });
});
