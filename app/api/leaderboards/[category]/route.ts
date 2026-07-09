import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { getLeaderboardRows, type RangeKey } from "@/lib/leaderboard";

export async function GET(req: NextRequest, { params }: { params: Promise<{ category: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const { category } = await params;
  const rangeParam = req.nextUrl.searchParams.get("range");
  const rangeKey: RangeKey = rangeParam === "month" || rangeParam === "all" ? rangeParam : "week";

  const result = await getLeaderboardRows(category, rangeKey, me);
  if (!result) return NextResponse.json({ error: "unknown category" }, { status: 404 });
  return NextResponse.json(result);
}
