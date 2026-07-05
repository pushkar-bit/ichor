import { NextRequest, NextResponse } from "next/server";
import { parseScreenshot } from "@/lib/ai";

/**
 * Simulated Gemini Vision OCR. Real integration point: send the uploaded image to
 * gemini-1.5-flash vision and parse the returned JSON — see lib/ai.ts parseScreenshot.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const extracted = parseScreenshot(file.name);
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const screenshotUrl = `data:${file.type};base64,${base64}`;

  return NextResponse.json({ extracted, screenshotUrl });
}
