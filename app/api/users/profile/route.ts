import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { User } from "@/models/User";

export async function PATCH(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { name, bio, avatarUrl, weightKg, heightCm } = await req.json();
  const updates: any = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof bio === "string") updates.bio = bio.slice(0, 200);
  if (typeof avatarUrl === "string") updates.avatarUrl = avatarUrl;
  if (typeof weightKg === "number") updates.weightKg = weightKg;
  if (typeof heightCm === "number") updates.heightCm = heightCm;
  
  await User.updateOne({ _id: me._id }, { $set: updates }, { strict: false });

  return NextResponse.json({ ok: true, name: updates.name || me.name, bio: updates.bio || me.bio, avatarUrl: updates.avatarUrl || me.avatarUrl });
}
