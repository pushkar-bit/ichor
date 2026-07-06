import { NextRequest, NextResponse } from "next/server";
import { parseScreenshot } from "@/lib/ai";

/**
 * Screenshot OCR: sends the uploaded image to Gemini Vision (gemini-2.5-flash) and
 * parses the returned JSON. Falls back to a deterministic stub if Gemini is
 * unavailable or fails — see lib/ai.ts parseScreenshot.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const screenshotUrl = `data:${file.type};base64,${base64}`;

  const extracted = await parseScreenshot(file.name, { base64Data: base64, mimeType: file.type });

  return NextResponse.json({ extracted, screenshotUrl });
}
