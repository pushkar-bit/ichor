import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Clan, ClanMember } from "@/models/Clan";

export async function GET(req: NextRequest) {
  await connectDB();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ clans: [] });

  const clans = await Clan.find({
    $or: [{ name: { $regex: q, $options: "i" } }, { tag: { $regex: q, $options: "i" } }],
  })
    .limit(20)
    .lean();

  const rows = await Promise.all(
    clans.map(async (clan: any) => ({
      id: String(clan._id),
      name: clan.name,
      tag: clan.tag,
      color: clan.color,
      memberCount: await ClanMember.countDocuments({ clanId: clan._id }),
    })),
  );

  return NextResponse.json({ clans: rows });
}
