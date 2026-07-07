import { connectDB } from "./mongodb";
import { User } from "@/models/User";
import { getSessionUserId } from "./session";

/**
 * Resolves the signed-in user from the session cookie. Returns null if there's no
 * session — user creation happens once, explicitly, in app/api/auth/google/route.ts.
 */
export async function getOrCreateCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  await connectDB();
  return User.findById(userId);
}

export async function requireUserId() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}
