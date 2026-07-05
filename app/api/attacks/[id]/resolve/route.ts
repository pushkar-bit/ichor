import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Attack } from "@/models/Attack";
import { resolveAttack } from "@/lib/territory";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const { winnerId } = await req.json();

  const attack = await Attack.findById(id);
  if (!attack) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isParticipant = [String(attack.attackerId), String(attack.defenderId)].includes(String(me._id));
  if (!isParticipant) return NextResponse.json({ error: "not a participant" }, { status: 403 });

  const resolved = await resolveAttack(id, winnerId);
  return NextResponse.json({ status: resolved?.status, winnerId: resolved?.winnerId });
}
