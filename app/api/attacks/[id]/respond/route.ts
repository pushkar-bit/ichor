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
  const { action } = await req.json();

  const attack = await Attack.findById(id);
  if (!attack) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (String(attack.defenderId) !== String(me._id)) {
    return NextResponse.json({ error: "only the defender can respond" }, { status: 403 });
  }
  if (attack.status !== "PENDING") {
    return NextResponse.json({ error: "attack already resolved" }, { status: 400 });
  }

  if (action === "FORFEIT") {
    attack.status = "FORFEITED";
    attack.resolvedAt = new Date();
    await attack.save();
    await resolveAttack(id, String(attack.attackerId));
  } else if (action === "ACCEPT") {
    attack.status = "ACCEPTED";
    await attack.save();
  } else {
    return NextResponse.json({ error: "action must be ACCEPT or FORFEIT" }, { status: 400 });
  }

  return NextResponse.json({ status: attack.status });
}
