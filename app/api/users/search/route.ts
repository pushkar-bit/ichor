import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  await connectDB();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ users: [] });

  const users = await User.find({
    $or: [{ name: { $regex: q, $options: "i" } }, { username: { $regex: q, $options: "i" } }],
  })
    .limit(20)
    .select("name username avatarUrl")
    .lean();

  return NextResponse.json({
    users: users.map((u: any) => ({
      id: String(u._id),
      name: u.name,
      username: u.username,
      avatarUrl: u.avatarUrl,
    })),
  });
}
