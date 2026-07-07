import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CampusZone } from "@/models/CampusZone";
import { reverseGeocode } from "@/lib/geocoding";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required numbers" }, { status: 400 });
  }

  await connectDB();

  try {
    const [geo, nearestZone] = await Promise.all([
      reverseGeocode(lat, lng),
      CampusZone.findOne({
        centroid: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 500 } },
      }).lean(),
    ]);

    return NextResponse.json({
      district: geo?.district ?? null,
      city: geo?.city ?? null,
      state: geo?.state ?? null,
      zone: nearestZone ? { id: String((nearestZone as any)._id), name: (nearestZone as any).name } : null,
    });
  } catch (err) {
    console.error("Location detect error:", err);
    return NextResponse.json({ error: "Failed to detect location" }, { status: 500 });
  }
}
