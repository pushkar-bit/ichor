import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";

export async function PATCH(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { name, bio, avatarUrl } = await req.json();
  if (typeof name === "string" && name.trim()) me.name = name.trim();
  if (typeof bio === "string") me.bio = bio.slice(0, 200);
  if (typeof avatarUrl === "string") me.avatarUrl = avatarUrl;
  await me.save();

  return NextResponse.json({ ok: true, name: me.name, bio: me.bio, avatarUrl: me.avatarUrl });
}
