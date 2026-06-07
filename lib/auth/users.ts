import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db/mongo";

interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

async function usersCollection(): Promise<Collection<UserDoc>> {
  const db = await getDb();
  const col = db.collection<UserDoc>("users");
  // Unique index — ensureIndex is idempotent so calling it on every request is fine
  // in development; in production it's a no-op after the first run.
  await col.createIndex({ email: 1 }, { unique: true });
  return col;
}

function serialize(doc: UserDoc): PublicUser {
  return { id: doc._id.toHexString(), name: doc.name, email: doc.email };
}

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
}

/** Returns null if the email is already taken. */
export async function createUser(data: NewUser): Promise<PublicUser | null> {
  const col = await usersCollection();
  const doc: UserDoc = {
    _id: new ObjectId(),
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash: data.passwordHash,
    createdAt: new Date(),
  };
  try {
    await col.insertOne(doc);
    return serialize(doc);
  } catch (err: unknown) {
    // Duplicate key error code 11000
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return null;
    }
    throw err;
  }
}

export async function findUserByEmail(
  email: string
): Promise<(UserDoc & { id: string }) | null> {
  const col = await usersCollection();
  const doc = await col.findOne({ email: email.toLowerCase() });
  if (!doc) return null;
  return { ...doc, id: doc._id.toHexString() };
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await usersCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? serialize(doc) : null;
}
