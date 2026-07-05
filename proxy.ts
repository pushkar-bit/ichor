import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
  if (isProtectedRoute(req) && !isPublicApiRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
