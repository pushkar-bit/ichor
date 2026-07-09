import mongoose from "mongoose";
import { Workout } from "@/models/Workout";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ichor";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var _ichorMongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._ichorMongoose ?? { conn: null, promise: null };
global._ichorMongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }
  cached.conn = await cached.promise;

  // Mongoose builds newly-added schema indexes in the background, unawaited by connect() —
  // a burst of writes right after a schema change can race past a not-yet-built unique index
  // and insert real duplicates, which then makes Mongo refuse to ever build it. Workout's
  // userId+externalId uniqueness (dedup for synced workouts) has to actually be enforced, not
  // eventually, so wait for it explicitly. Model.init() caches its resolved promise, so this
  // is a no-op after the first call.
  await Workout.init();

  return cached.conn;
}
