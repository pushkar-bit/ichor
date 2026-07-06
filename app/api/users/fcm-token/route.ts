import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";

export async function PATCH(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { token } = await req.json();
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  me.fcmToken = token;
  await me.save();

  return NextResponse.json({ ok: true });
}
