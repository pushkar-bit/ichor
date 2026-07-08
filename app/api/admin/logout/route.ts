import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/adminAuth";

export async function POST(req: Request) {
  await clearAdminSessionCookie();
  return NextResponse.redirect(new URL("/admin/login", req.url));
}
