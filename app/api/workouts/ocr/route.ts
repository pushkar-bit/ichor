import { NextRequest, NextResponse } from "next/server";
import { parseScreenshot, AIServiceError } from "@/lib/ai";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { connectDB } from "@/lib/mongodb";

/**
 * Screenshot OCR: sends the uploaded image to Gemini Vision (gemini-2.5-flash) and
 * parses the returned JSON. Falls back to a deterministic stub if Gemini is
 * unavailable or fails — see lib/ai.ts parseScreenshot.
 */
export async function POST(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const screenshotUrl = `data:${file.type};base64,${base64}`;

  try {
    const extracted = await parseScreenshot(file.name, { base64Data: base64, mimeType: file.type }, me?.weightKg);
    return NextResponse.json({ extracted, screenshotUrl });
  } catch (err) {
    const status = err instanceof AIServiceError ? err.status : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
