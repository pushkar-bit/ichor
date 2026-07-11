import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { joinGroupRun } from "@/lib/groupRun";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const groupRun = await joinGroupRun(id, String(me._id));
  if (!groupRun) return NextResponse.json({ error: "group run not found or already ended" }, { status: 404 });

  return NextResponse.json({ status: groupRun.status });
}
