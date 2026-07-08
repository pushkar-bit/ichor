import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials, signAdminSession, setAdminSessionCookie } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!verifyAdminCredentials(email, password)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signAdminSession();
  await setAdminSessionCookie(token);
  return NextResponse.json({ ok: true });
}
