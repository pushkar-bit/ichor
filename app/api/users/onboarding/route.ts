import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const me = await getOrCreateCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json();
    const { weightKg, heightCm, username } = body;

    if (!weightKg || !heightCm) {
      return NextResponse.json({ error: "Weight and height are required" }, { status: 400 });
    }

    const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
    if (!me.username && !/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters: lowercase letters, numbers, underscores." },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = { weightKg: Number(weightKg), heightCm: Number(heightCm) };
    if (!me.username) updates.username = normalizedUsername;

    await User.updateOne({ _id: me._id }, { $set: updates }, { strict: false });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
