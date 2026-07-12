import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { respondToBattle } from "@/lib/battles";

/**
 * Defender's answer to a PENDING_RESPONSE battle:
 *   { action: "REFUSE" }
 *   { action: "ACCEPT_ASYNC", metric?: "PACE" | "DISTANCE" }
 *   { action: "ACCEPT_DUEL", metric, windowStart, windowEnd }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  if (!["REFUSE", "ACCEPT_ASYNC", "ACCEPT_DUEL"].includes(body.action)) {
    return NextResponse.json({ error: "action must be REFUSE, ACCEPT_ASYNC or ACCEPT_DUEL" }, { status: 400 });
  }
  if (body.action === "ACCEPT_DUEL") {
    if (!["PACE", "DISTANCE"].includes(body.metric) || !body.windowStart || !body.windowEnd) {
      return NextResponse.json({ error: "ACCEPT_DUEL needs metric, windowStart and windowEnd" }, { status: 400 });
    }
  }
  if (body.action === "ACCEPT_ASYNC" && body.metric && !["PACE", "DISTANCE"].includes(body.metric)) {
    return NextResponse.json({ error: "metric must be PACE or DISTANCE" }, { status: 400 });
  }

  const result = await respondToBattle(String(me._id), id, body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
