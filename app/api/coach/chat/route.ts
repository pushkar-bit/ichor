import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { CoachMessage } from "@/models/CoachMessage";
import { Territory } from "@/models/Territory";
import { computeUserWeeklyScore } from "@/lib/scoring";
import { coachReply } from "@/lib/ai";

export async function GET() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const messages = await CoachMessage.find({ userId: me._id }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({
    messages: messages.map((m: any) => ({ id: String(m._id), role: m.role, text: m.text, createdAt: m.createdAt })),
  });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { message } = await req.json();
  if (!message || !message.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

  await CoachMessage.create({ userId: me._id, role: "user", text: message });

  const score = await computeUserWeeklyScore(String(me._id));
  const zonesHeld = await Territory.countDocuments({ ownerId: me._id });

  const reply = coachReply(message, {
    name: me.name,
    weeklyCaloriesBurned: score.baseCalories,
    streakDays: me.streakDays,
    integrityPoints: me.integrityPoints,
    battlesWon: me.battlesWon,
    battlesLost: me.battlesLost,
    zonesHeld,
  });

  await CoachMessage.create({ userId: me._id, role: "coach", text: reply });

  return NextResponse.json({ reply });
}
