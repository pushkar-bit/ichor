import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { User } from "@/models/User";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export async function PATCH(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { name, bio, username, avatarUrl, weightKg, heightCm } = await req.json();
  const updates: any = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof bio === "string") updates.bio = bio.slice(0, 200);
  if (typeof username === "string") {
    const normalized = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalized)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters: lowercase letters, numbers, underscores." },
        { status: 400 },
      );
    }
    updates.username = normalized;
  }
  if (typeof avatarUrl === "string" && avatarUrl) {
    updates.avatarUrl = avatarUrl;
    updates.avatarIsCustom = true;
  }
  if (typeof weightKg === "number") updates.weightKg = weightKg;
  if (typeof heightCm === "number") updates.heightCm = heightCm;

  try {
    await User.updateOne({ _id: me._id }, { $set: updates }, { strict: false });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({
    ok: true,
    name: updates.name || me.name,
    bio: updates.bio || me.bio,
    username: updates.username || me.username,
    avatarUrl: updates.avatarUrl || me.avatarUrl,
  });
}
