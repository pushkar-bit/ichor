import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { getTerritorySummary } from "@/lib/territorySummary";
import "@/models/User";

/** Backs the persistent territory strip above the feed. */
export async function GET() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  return NextResponse.json(await getTerritorySummary(String(me._id)));
}
