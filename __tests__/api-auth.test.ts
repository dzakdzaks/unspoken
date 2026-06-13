import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "unspoken_session";

const { mockVerifySessionToken } = vi.hoisted(() => ({
  mockVerifySessionToken: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE: "unspoken_session",
  verifySessionToken: mockVerifySessionToken,
}));

function createMockRequest(cookieValue?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === SESSION_COOKIE && cookieValue
          ? { value: cookieValue, name }
          : undefined,
    },
  } as unknown as NextRequest;
}

describe("getUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns userId when session cookie has valid token", async () => {
    mockVerifySessionToken.mockResolvedValue({ sub: "user-abc-123" });
    const { getUserId } = await import("@/lib/api/auth");
    const result = await getUserId(createMockRequest("valid-token"));
    expect(result).toBe("user-abc-123");
  });

  it("returns null when no session cookie exists", async () => {
    mockVerifySessionToken.mockResolvedValue(null);
    const { getUserId } = await import("@/lib/api/auth");
    const result = await getUserId(createMockRequest());
    expect(result).toBeNull();
  });

  it("returns null when token verification fails (error caught internally)", async () => {
    mockVerifySessionToken.mockResolvedValue(null);
    const { getUserId } = await import("@/lib/api/auth");
    const result = await getUserId(createMockRequest("bad-token"));
    expect(result).toBeNull();
  });

  it("returns null when token payload has no sub", async () => {
    mockVerifySessionToken.mockResolvedValue({} as any);
    const { getUserId } = await import("@/lib/api/auth");
    const result = await getUserId(createMockRequest("no-sub-token"));
    expect(result).toBeNull();
  });
});
