import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/session";
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSession } from "@/lib/adminAuth";

const PROTECTED_PREFIXES = ["/feed", "/post", "/map", "/leaderboard", "/clans", "/coach", "/profile", "/api"];

// Excluded from the protected-route gate above: /api/public/* (unauthenticated read
// endpoints) and /api/auth/* (the login/logout routes themselves — they can't require
// a session that doesn't exist yet).
const PUBLIC_API_PREFIXES = ["/api/public", "/api/auth"];

// Admin is a completely separate root, with its own session/cookie/credentials —
// unrelated to the regular Google-authenticated user session above.
const ADMIN_PREFIXES = ["/admin", "/api/admin"];
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/login"];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute = ADMIN_PREFIXES.some((p) => matchesPrefix(pathname, p));
  if (isAdminRoute) {
    if (PUBLIC_ADMIN_PATHS.some((p) => matchesPrefix(pathname, p))) return NextResponse.next();

    const adminToken = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const isAdmin = adminToken ? await verifyAdminSession(adminToken) : false;
    if (isAdmin) return NextResponse.next();

    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

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
