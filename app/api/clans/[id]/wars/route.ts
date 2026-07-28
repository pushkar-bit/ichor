import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getClanWars } from "@/lib/clanWars";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const wars = await getClanWars(id);
  return NextResponse.json({ wars });
}
