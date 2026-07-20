import { Link2 } from "lucide-react";

// Strava's OAuth here is a plain server redirect (unlike Google's client-side token flow via
// useGoogleLogin), so this is just a styled link to the initiate route — no client JS needed.
// Same orange (#FC4C02) + icon already used for "Connect Strava" on the profile page
// (StravaConnectButton) so the two surfaces read as the same brand action.
export function StravaSignInButton({ label = "Continue with Strava" }: { label?: string }) {
  return (
    <a
      href="/api/auth/strava"
      className="w-full flex items-center justify-center gap-3 border border-border-ichor hover:bg-white/5 transition-colors rounded-xl py-3 text-white font-medium"
    >
      <Link2 className="w-5 h-5 text-[#FC4C02]" />
      {label}
    </a>
  );
}

export function StravaNotConfiguredNotice() {
  return (
    <div className="text-xs text-white/40 text-center border border-dashed border-border-ichor rounded-xl py-3 px-4">
      Strava sign-in isn&apos;t configured yet. Add <code className="text-white/60">STRAVA_CLIENT_ID</code> and{" "}
      <code className="text-white/60">STRAVA_CLIENT_SECRET</code> to <code className="text-white/60">.env</code>.
    </div>
  );
}
