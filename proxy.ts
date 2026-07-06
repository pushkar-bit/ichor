import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/feed(.*)",
  "/post(.*)",
  "/map(.*)",
  "/leaderboard(.*)",
  "/clans(.*)",
  "/coach(.*)",
  "/profile(.*)",
  "/admin(.*)",
  "/api/:path*",
]);

const isPublicApiRoute = createRouteMatcher(["/api/public/:path*"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req) || isPublicApiRoute(req)) return;

  const { userId } = await auth();
  if (userId) return;

  if (req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const signInUrl = new URL("/sign-in", req.url);
  signInUrl.searchParams.set("redirect_url", req.url);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
