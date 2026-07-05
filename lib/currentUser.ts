import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { connectDB } from "./mongodb";
import { User } from "@/models/User";

export async function getOrCreateCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  await connectDB();
  let dbUser = await User.findOne({ clerkId: userId });

  if (!dbUser) {
    const clerkUser = await clerkCurrentUser();
    if (!clerkUser) return null;
    dbUser = await User.create({
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name: clerkUser.fullName || clerkUser.username || "New Athlete",
      avatarUrl: clerkUser.imageUrl ?? "",
    });
  }

  return dbUser;
}

export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}
