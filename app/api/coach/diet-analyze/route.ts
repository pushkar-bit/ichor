import { NextRequest, NextResponse } from "next/server";
import { classifyDiet } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const { description } = await req.json();
  if (!description || !description.trim()) {
    return NextResponse.json({ error: "description required" }, { status: 400 });
  }
  return NextResponse.json(classifyDiet(description));
}
