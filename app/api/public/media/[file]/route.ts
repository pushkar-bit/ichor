import { NextRequest, NextResponse } from "next/server";
import { stat, open } from "fs/promises";
import path from "path";

/**
 * Media-serving route with proper HTTP Range request support.
 *
 * Why this exists:
 *   Turbopack's dev server returns HTTP 416 for Range requests on files in
 *   public/. Every browser-native <video> and <audio> element sends Range
 *   headers for streaming — so anim.mp4 and logo.mp3 never load via a
 *   plain public/ URL in development. This route parses the Range header
 *   and responds with 206 Partial Content, satisfying the browser.
 *
 *   On Vercel (production) this route also works, since Vercel's CDN
 *   forwards Range requests to the origin as normal HTTP requests.
 *
 * Public API — no auth required.
 * Route: /api/public/media/[file]
 *   /api/public/media/anim  → public/anim.mp4   (video/mp4)
 *   /api/public/media/logo  → public/logo.mp3   (audio/mpeg)
 */

const ALLOWED: Record<string, { filename: string; mime: string }> = {
  anim: { filename: "anim.mp4", mime: "video/mp4" },
  logo: { filename: "logo.mp3", mime: "audio/mpeg" },
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  const config = ALLOWED[file];
  if (!config) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", config.filename);

  let fileSize: number;
  try {
    const stats = await stat(filePath);
    fileSize = stats.size;
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }

  if (fileSize === 0) {
    return new NextResponse("Media file is empty", { status: 404 });
  }

  const rangeHeader = req.headers.get("range");

  // ── Ranged response (browser streaming) ────────────────────────────────
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
      return new NextResponse("Invalid Range", { status: 416 });
    }

    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (start > end || end >= fileSize) {
      return new NextResponse("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const chunkSize = end - start + 1;

    // Stream the exact byte range
    const fd = await open(filePath, "r");
    const buffer = Buffer.allocUnsafe(chunkSize);
    await fd.read(buffer, 0, chunkSize, start);
    await fd.close();

    return new NextResponse(buffer, {
      status: 206,
      headers: {
        "Content-Type": config.mime,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(chunkSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // ── Full file response (first request or non-range client) ─────────────
  const fd = await open(filePath, "r");
  const buffer = Buffer.allocUnsafe(fileSize);
  await fd.read(buffer, 0, fileSize, 0);
  await fd.close();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": config.mime,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
