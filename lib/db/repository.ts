import { ObjectId, type Collection } from "mongodb";
import { getDb } from "./mongo";
import type { TranslationResult } from "@/lib/schema";
import type { Locale } from "@/lib/i18n/translations";
import type { Message, Role, MessageKind, Room } from "@/lib/chat/types";

export type { Message, Role, MessageKind, Room } from "@/lib/chat/types";

interface RoomDoc {
  _id: ObjectId;
  userId: string;
  title: string;
  lang: Locale;
  contextSummary?: string;
  summaryThroughMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MessageDoc {
  _id: ObjectId;
  roomId: ObjectId;
  role: Role;
  kind: MessageKind;
  content: string;
  decoded?: TranslationResult;
  suggestions?: string[];
  createdAt: Date;
}

async function rooms(): Promise<Collection<RoomDoc>> {
  return (await getDb()).collection<RoomDoc>("rooms");
}

async function messages(): Promise<Collection<MessageDoc>> {
  return (await getDb()).collection<MessageDoc>("messages");
}

function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function serializeRoom(doc: RoomDoc): Room {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    lang: doc.lang,
    ...(doc.contextSummary ? { contextSummary: doc.contextSummary } : {}),
    ...(doc.summaryThroughMessageId
      ? { summaryThroughMessageId: doc.summaryThroughMessageId }
      : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function serializeMessage(doc: MessageDoc): Message {
  return {
    id: doc._id.toHexString(),
    roomId: doc.roomId.toHexString(),
    role: doc.role,
    kind: doc.kind,
    content: doc.content,
    decoded: doc.decoded,
    suggestions: doc.suggestions,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listRooms(userId: string): Promise<Room[]> {
  const col = await rooms();
  const docs = await col.find({ userId }).sort({ updatedAt: -1 }).toArray();
  return docs.map(serializeRoom);
}

export async function createRoom(
  userId: string,
  title: string,
  lang: Locale
): Promise<Room> {
  const col = await rooms();
  const now = new Date();
  const doc: RoomDoc = {
    _id: new ObjectId(),
    userId,
    title: title.slice(0, 80) || "New chat",
    lang,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return serializeRoom(doc);
}

/** Returns the room only if it belongs to the given user. */
export async function getRoom(userId: string, roomId: string): Promise<Room | null> {
  const oid = toObjectId(roomId);
  if (!oid) return null;
  const col = await rooms();
  const doc = await col.findOne({ _id: oid, userId });
  return doc ? serializeRoom(doc) : null;
}

export async function renameRoom(
  userId: string,
  roomId: string,
  title: string
): Promise<Room | null> {
  const oid = toObjectId(roomId);
  if (!oid) return null;
  const col = await rooms();
  const doc = await col.findOneAndUpdate(
    { _id: oid, userId },
    { $set: { title: title.slice(0, 80), updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return doc ? serializeRoom(doc) : null;
}

export async function deleteRoom(userId: string, roomId: string): Promise<boolean> {
  const oid = toObjectId(roomId);
  if (!oid) return false;
  const roomCol = await rooms();
  const res = await roomCol.deleteOne({ _id: oid, userId });
  if (res.deletedCount === 0) return false;
  const msgCol = await messages();
  await msgCol.deleteMany({ roomId: oid });
  return true;
}

export async function touchRoom(roomId: string): Promise<void> {
  const oid = toObjectId(roomId);
  if (!oid) return;
  const col = await rooms();
  await col.updateOne({ _id: oid }, { $set: { updatedAt: new Date() } });
}

export async function updateRoomContextSummary(
  roomId: string,
  contextSummary: string,
  summaryThroughMessageId: string
): Promise<void> {
  const oid = toObjectId(roomId);
  if (!oid) return;
  const col = await rooms();
  await col.updateOne(
    { _id: oid },
    {
      $set: {
        contextSummary,
        summaryThroughMessageId,
        updatedAt: new Date(),
      },
    }
  );
}

export async function listMessages(roomId: string): Promise<Message[]> {
  const oid = toObjectId(roomId);
  if (!oid) return [];
  const col = await messages();
  const docs = await col.find({ roomId: oid }).sort({ createdAt: 1 }).toArray();
  return docs.map(serializeMessage);
}

export async function countMessages(roomId: string): Promise<number> {
  const oid = toObjectId(roomId);
  if (!oid) return 0;
  const col = await messages();
  return col.countDocuments({ roomId: oid });
}

/** Deletes a single message, scoped to its room. Used to clear an orphaned
 * user turn (one whose assistant reply failed) before a retry. */
export async function deleteMessage(
  roomId: string,
  messageId: string
): Promise<boolean> {
  const roomOid = toObjectId(roomId);
  const msgOid = toObjectId(messageId);
  if (!roomOid || !msgOid) return false;
  const col = await messages();
  const res = await col.deleteOne({ _id: msgOid, roomId: roomOid });
  return res.deletedCount > 0;
}

interface NewMessage {
  role: Role;
  kind: MessageKind;
  content: string;
  decoded?: TranslationResult;
  suggestions?: string[];
}

export async function addMessage(roomId: string, msg: NewMessage): Promise<Message> {
  const oid = toObjectId(roomId);
  if (!oid) throw new Error("Invalid room id.");
  const col = await messages();
  const doc: MessageDoc = {
    _id: new ObjectId(),
    roomId: oid,
    role: msg.role,
    kind: msg.kind,
    content: msg.content,
    ...(msg.decoded ? { decoded: msg.decoded } : {}),
    ...(msg.suggestions?.length ? { suggestions: msg.suggestions } : {}),
    createdAt: new Date(),
  };
  await col.insertOne(doc);
  return serializeMessage(doc);
}
