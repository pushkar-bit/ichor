import { cache } from "react";
import { connectDB } from "./mongodb";
import { User } from "@/models/User";
import { getSessionUserId } from "./session";

/**
 * Resolves the signed-in user from the session cookie. Returns null if there's no
 * session — user creation happens once, explicitly, in app/api/auth/google/route.ts.
 *
 * Wrapped in React's cache() because the layout resolves this to gate the route and
 * nearly every page resolves it again for its own data — cache() dedupes those into
 * a single session-verify + Mongo lookup per request instead of two serialized ones.
 */
export const getOrCreateCurrentUser = cache(async function getOrCreateCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  await connectDB();
  return User.findById(userId);
});

export async function requireUserId() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}
