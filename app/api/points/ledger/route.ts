import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { PointsLedger } from "@/models/PointsLedger";
import { POINT_REASON_LABELS } from "@/lib/points";

const PAGE_SIZE = 30;

/** The caller's own point history (profile page). */
export async function GET(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const cursor = req.nextUrl.searchParams.get("cursor");
  const query: Record<string, unknown> = { userId: me._id };
  if (cursor) query.createdAt = { $lt: new Date(cursor) };

  const entries = await PointsLedger.find(query).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean();

  return NextResponse.json({
    points: me.points ?? 0,
    entries: entries.map((e: any) => ({
      id: String(e._id),
      amount: e.amount,
      reason: e.reason,
      label: POINT_REASON_LABELS[e.reason as keyof typeof POINT_REASON_LABELS] ?? e.reason,
      createdAt: e.createdAt,
    })),
    nextCursor: entries.length === PAGE_SIZE ? entries[entries.length - 1].createdAt : null,
  });
}
