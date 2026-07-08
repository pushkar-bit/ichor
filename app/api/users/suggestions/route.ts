import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { getFollowSuggestions } from "@/lib/followSuggestions";

export async function GET() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const suggestions = await getFollowSuggestions(String(me._id), me.clanId, 15);
  return NextResponse.json({ suggestions });
}
