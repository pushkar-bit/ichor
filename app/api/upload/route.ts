import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getOrCreateCurrentUser } from "@/lib/currentUser";

/**
 * Generates signed Cloudinary upload params so the browser can upload directly
 * (backend never touches binary data). Requires CLOUDINARY_CLOUD_NAME,
 * CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET — until all three are set this
 * endpoint returns 503 and the composer falls back to storing photos as data URLs.
 */
export async function POST() {
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary is not fully configured on the server" }, { status: 503 });
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder: "ichor" }, apiSecret);

  return NextResponse.json({ signature, timestamp, cloudName, apiKey, folder: "ichor" });
}
