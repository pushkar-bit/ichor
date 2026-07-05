import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CampusZone } from "@/models/CampusZone";
import { Territory } from "@/models/Territory";
import "@/models/User";

export async function GET() {
  await connectDB();
  const zones = await CampusZone.find({}).sort({ name: 1 }).lean();
  const territories = await Territory.find({}).populate("ownerId").lean();
  const byZone = new Map(territories.map((t: any) => [String(t.zoneId), t]));

  return NextResponse.json({
    zones: zones.map((z: any) => ({
      id: String(z._id),
      name: z.name,
      description: z.description,
      color: z.color,
      ownerName: byZone.get(String(z._id))?.ownerId?.name ?? null,
      weeklyCalorieScore: byZone.get(String(z._id))?.weeklyCalorieScore ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { name, description, color, polygon, gridX, gridY, gridW, gridH } = body;

  if (!name || !polygon) {
    return NextResponse.json({ error: "name and polygon (GeoJSON) are required" }, { status: 400 });
  }

  const coords = polygon.coordinates[0];
  const lng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
  const lat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;

  const zone = await CampusZone.create({
    name,
    description: description ?? "",
    color: color ?? "#AE93F4",
    polygon,
    centroid: { type: "Point", coordinates: [lng, lat] },
    gridX: gridX ?? 10,
    gridY: gridY ?? 10,
    gridW: gridW ?? 16,
    gridH: gridH ?? 14,
  });

  return NextResponse.json({ id: String(zone._id) });
}
