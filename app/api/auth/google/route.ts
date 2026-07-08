import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { signSession, setSessionCookie } from "@/lib/session";

type GoogleUserinfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function POST(req: NextRequest) {
  const { access_token } = await req.json();
  if (typeof access_token !== "string" || !access_token) {
    return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
  }

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) {
    return NextResponse.json({ error: "Invalid Google access token" }, { status: 401 });
  }
  const profile: GoogleUserinfo = await infoRes.json();
  if (!profile.sub || !profile.email) {
    return NextResponse.json({ error: "Google account missing required profile fields" }, { status: 400 });
  }

  try {
    await connectDB();
    let dbUser = await User.findOne({ googleId: profile.sub });

    if (!dbUser) {
      // A returning user whose Google account produces the same email but (rarely) a
      // different sub isn't expected here, but reconcile by email defensively anyway
      // rather than silently creating a duplicate profile. Leave dbUser.googleId unset
      // here — mutating it in memory would mask the diff check below and the real
      // googleId would never actually get persisted to the database.
      dbUser = await User.findOne({ email: profile.email });
    }

    if (!dbUser) {
      dbUser = await User.create({
        googleId: profile.sub,
        email: profile.email,
        name: profile.name || "New Athlete",
        avatarUrl: profile.picture ?? "",
      });
    } else {
      const updates: Record<string, unknown> = {};
      if (dbUser.googleId !== profile.sub) updates.googleId = profile.sub;
      if (dbUser.email !== profile.email) updates.email = profile.email;
      if (!dbUser.avatarIsCustom && profile.picture && dbUser.avatarUrl !== profile.picture) {
        updates.avatarUrl = profile.picture;
      }
      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: dbUser._id }, { $set: updates });
      }
    }

    const token = await signSession(String(dbUser._id));
    await setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/google] failed:", err);
    const message =
      err instanceof Error && (err as { code?: number }).code === 11000
        ? "That Google account conflicts with an existing profile — contact support."
        : "Something went wrong signing you in. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
