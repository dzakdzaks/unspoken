import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

const { mockDeleteOne } = vi.hoisted(() => ({
  mockDeleteOne: vi.fn(),
}));

vi.mock("@/lib/db/mongo", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      deleteOne: mockDeleteOne,
    }),
  }),
}));

vi.mock("@/instrumentation", () => ({
  langfuseSpanProcessor: {},
}));

vi.mock("@langfuse/tracing", () => ({
  startActiveObservation: vi.fn((_name: string, fn: () => unknown) => fn()),
  propagateAttributes: vi.fn((_attrs: unknown, fn: () => unknown) => fn()),
  startObservation: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    end: vi.fn(),
  })),
}));

import * as auth from "@/lib/api/auth";
import * as repository from "@/lib/db/repository";
import { DELETE } from "@/app/api/rooms/[id]/messages/route";

const VALID_ROOM_ID = "507f1f77bcf86cd799439011";
const VALID_MESSAGE_ID = "507f1f77bcf86cd799439012";

describe("deleteMessage", () => {
  beforeEach(() => {
    mockDeleteOne.mockReset();
  });

  it("returns true when deleteOne removes a document", async () => {
    mockDeleteOne.mockResolvedValue({ deletedCount: 1 });
    const result = await repository.deleteMessage(
      VALID_ROOM_ID,
      VALID_MESSAGE_ID
    );
    expect(result).toBe(true);
    expect(mockDeleteOne).toHaveBeenCalledWith({
      _id: new ObjectId(VALID_MESSAGE_ID),
      roomId: new ObjectId(VALID_ROOM_ID),
    });
  });

  it("returns false when deleteOne finds no document", async () => {
    mockDeleteOne.mockResolvedValue({ deletedCount: 0 });
    const result = await repository.deleteMessage(
      VALID_ROOM_ID,
      VALID_MESSAGE_ID
    );
    expect(result).toBe(false);
  });

  it("returns false for invalid room id without calling deleteOne", async () => {
    const result = await repository.deleteMessage(
      "not-an-object-id",
      VALID_MESSAGE_ID
    );
    expect(result).toBe(false);
    expect(mockDeleteOne).not.toHaveBeenCalled();
  });

  it("returns false for invalid message id without calling deleteOne", async () => {
    const result = await repository.deleteMessage(
      VALID_ROOM_ID,
      "not-an-object-id"
    );
    expect(result).toBe(false);
    expect(mockDeleteOne).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/rooms/[id]/messages", () => {
  beforeEach(() => {
    vi.spyOn(auth, "getUserId");
    vi.spyOn(repository, "getRoom");
    vi.spyOn(repository, "deleteMessage");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeDeleteRequest(messageId?: string): NextRequest {
    const url = messageId
      ? `http://localhost/api/rooms/${VALID_ROOM_ID}/messages?messageId=${messageId}`
      : `http://localhost/api/rooms/${VALID_ROOM_ID}/messages`;
    return new NextRequest(url, { method: "DELETE" });
  }

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth.getUserId).mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(VALID_MESSAGE_ID), {
      params: Promise.resolve({ id: VALID_ROOM_ID }),
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Missing user id." });
  });

  it("returns 404 when room is not found", async () => {
    vi.mocked(auth.getUserId).mockResolvedValue("user-1");
    vi.mocked(repository.getRoom).mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(VALID_MESSAGE_ID), {
      params: Promise.resolve({ id: VALID_ROOM_ID }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Room not found." });
  });

  it("returns 400 when messageId query param is missing", async () => {
    vi.mocked(auth.getUserId).mockResolvedValue("user-1");
    vi.mocked(repository.getRoom).mockResolvedValue({
      id: VALID_ROOM_ID,
      title: "Test",
      lang: "en",
      createdAt: "",
      updatedAt: "",
    });
    const res = await DELETE(makeDeleteRequest(), {
      params: Promise.resolve({ id: VALID_ROOM_ID }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing message id." });
  });

  it("returns 404 when message is not found", async () => {
    vi.mocked(auth.getUserId).mockResolvedValue("user-1");
    vi.mocked(repository.getRoom).mockResolvedValue({
      id: VALID_ROOM_ID,
      title: "Test",
      lang: "en",
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(repository.deleteMessage).mockResolvedValue(false);
    const res = await DELETE(makeDeleteRequest(VALID_MESSAGE_ID), {
      params: Promise.resolve({ id: VALID_ROOM_ID }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Message not found." });
  });

  it("returns 200 on successful deletion", async () => {
    vi.mocked(auth.getUserId).mockResolvedValue("user-1");
    vi.mocked(repository.getRoom).mockResolvedValue({
      id: VALID_ROOM_ID,
      title: "Test",
      lang: "en",
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(repository.deleteMessage).mockResolvedValue(true);
    const res = await DELETE(makeDeleteRequest(VALID_MESSAGE_ID), {
      params: Promise.resolve({ id: VALID_ROOM_ID }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(repository.deleteMessage).toHaveBeenCalledWith(
      VALID_ROOM_ID,
      VALID_MESSAGE_ID
    );
  });
});
