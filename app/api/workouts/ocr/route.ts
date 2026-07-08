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
  
  let screenshotUrl = "";
  let base64 = "";
  let mimeType = "image/jpeg";
  let fileName = "screenshot.jpg";

  if (req.headers.get("content-type")?.includes("application/json")) {
    const json = await req.json();
    if (!json.imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    screenshotUrl = json.imageUrl;
    
    // Download image from Cloudinary to pass to Gemini
    const res = await fetch(screenshotUrl);
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch image from Cloudinary" }, { status: 400 });
    const arrayBuffer = await res.arrayBuffer();
    base64 = Buffer.from(arrayBuffer).toString("base64");
    mimeType = res.headers.get("content-type") || "image/jpeg";
    fileName = screenshotUrl.split('/').pop() || "screenshot.jpg";
  } else {
    // Fallback for FormData (if client still uses it temporarily)
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
    const arrayBuffer = await file.arrayBuffer();
    base64 = Buffer.from(arrayBuffer).toString("base64");
    screenshotUrl = `data:${file.type};base64,${base64}`;
    mimeType = file.type;
    fileName = file.name;
  }

  try {
    const extracted = await parseScreenshot(fileName, { base64Data: base64, mimeType }, me?.weightKg);
    return NextResponse.json({ extracted, screenshotUrl });
  } catch (err) {
    const status = err instanceof AIServiceError ? err.status : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
