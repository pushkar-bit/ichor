import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CampusZone } from "@/models/CampusZone";
import { Territory } from "@/models/Territory";
import "@/models/User";
import "@/models/Clan";

export async function GET() {
  await connectDB();
  const zones = await CampusZone.find({}).sort({ name: 1 }).lean();
  const territories = await Territory.find({ zoneId: { $in: zones.map((z: any) => z._id) } })
    .populate("ownerId")
    .populate("clanId")
    .lean();

  const territoryByZone = new Map(territories.map((t: any) => [String(t.zoneId), t]));

  const result = zones.map((z: any) => {
    const t = territoryByZone.get(String(z._id));
    return {
      id: String(z._id),
      name: z.name,
      description: z.description,
      color: z.color,
      gridX: z.gridX,
      gridY: z.gridY,
      gridW: z.gridW,
      gridH: z.gridH,
      territory: t
        ? {
            id: String(t._id),
            ownerId: t.ownerId ? String(t.ownerId._id ?? t.ownerId) : null,
            ownerName: t.ownerId?.name ?? null,
            ownerAvatarUrl: t.ownerId?.avatarUrl ?? null,
            clanColor: t.clanId?.color ?? null,
            clanName: t.clanId?.name ?? null,
            weeklyCalorieScore: t.weeklyCalorieScore,
            lastDefended: t.lastDefended,
          }
        : null,
    };
  });

  return NextResponse.json({ zones: result });
}
