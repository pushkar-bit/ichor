import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { connectDB } from "./mongodb";
import { User } from "@/models/User";

export async function getOrCreateCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  await connectDB();
  let dbUser = await User.findOne({ clerkId: userId });

  const clerkUser = await clerkCurrentUser();
  if (!clerkUser) return dbUser;

  const liveEmail = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const liveAvatarUrl = clerkUser.imageUrl ?? "";

  if (!dbUser && liveEmail) {
    // A different Clerk identity (e.g. signing in with Google after originally signing up another
    // way) can resolve to a new userId for the same person. Reconcile by email instead of silently
    // creating a second, empty profile that orphans the real one.
    dbUser = await User.findOne({ email: liveEmail });
    if (dbUser) dbUser.clerkId = userId;
  }

  if (!dbUser) {
    return User.create({
      clerkId: userId,
      email: liveEmail,
      name: clerkUser.fullName || clerkUser.username || "New Athlete",
      avatarUrl: liveAvatarUrl,
    });
  }

  // Keep the avatar auto-synced with whatever OAuth provider (Google/GitHub/etc.) the user is
  // connected with, unless they've manually uploaded their own picture (avatarIsCustom).
  const updates: Record<string, unknown> = {};
  if (dbUser.clerkId !== userId) updates.clerkId = userId;
  if (liveEmail && dbUser.email !== liveEmail) updates.email = liveEmail;
  if (!dbUser.avatarIsCustom && liveAvatarUrl && dbUser.avatarUrl !== liveAvatarUrl) {
    updates.avatarUrl = liveAvatarUrl;
  }

  if (Object.keys(updates).length > 0) {
    await User.updateOne({ _id: dbUser._id }, { $set: updates });
    Object.assign(dbUser, updates);
  }

  return dbUser;
}

export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}
