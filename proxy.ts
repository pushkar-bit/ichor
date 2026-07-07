import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/session";

const PROTECTED_PREFIXES = ["/feed", "/post", "/map", "/leaderboard", "/clans", "/coach", "/profile", "/admin", "/api"];

// Excluded from the protected-route gate above: /api/public/* (unauthenticated read
// endpoints) and /api/auth/* (the login/logout routes themselves — they can't require
// a session that doesn't exist yet).
const PUBLIC_API_PREFIXES = ["/api/public", "/api/auth"];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => matchesPrefix(pathname, p));
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => matchesPrefix(pathname, p));
  if (!isProtected || isPublicApi) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userId = token ? await verifySession(token) : null;
  if (userId) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const signInUrl = new URL("/sign-in", req.url);
  signInUrl.searchParams.set("redirect_url", req.url);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
