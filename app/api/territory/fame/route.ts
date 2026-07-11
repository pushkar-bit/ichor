import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getTerritoryFameLeaderboard } from "@/lib/territory";
import "@/models/CampusZone";
import "@/models/User";
import "@/models/Clan";

export async function GET() {
  await connectDB();
  const territories = await getTerritoryFameLeaderboard(20);
  return NextResponse.json({ territories });
}
