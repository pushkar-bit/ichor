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
    const { weightKg, heightCm } = body;

    if (!weightKg || !heightCm) {
      return NextResponse.json({ error: "Weight and height are required" }, { status: 400 });
    }

    await User.updateOne(
      { _id: me._id },
      { $set: { weightKg: Number(weightKg), heightCm: Number(heightCm) } },
      { strict: false }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
