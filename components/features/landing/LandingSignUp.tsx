import { GoogleSignInButton, GoogleNotConfiguredNotice } from "@/components/features/GoogleSignInButton";
import { StravaSignInButton, StravaNotConfiguredNotice } from "@/components/features/StravaSignInButton";

export default function LandingSignUp() {
  const googleConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const stravaConfigured = Boolean(process.env.STRAVA_CLIENT_ID);

  return (
    <section
      id="join"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-24"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-momentum/14 blur-[130px]" />

      <div className="glass-panel relative flex w-full max-w-lg flex-col items-center rounded-[2rem] px-8 py-14 text-center md:px-14 md:py-16">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.5em] text-afterrun">Join the pack</p>

        <h2 className="text-balance font-display italic text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
          Your first run
          <br />
          starts here.
        </h2>
        <p className="mt-6 max-w-sm text-base text-white/60 md:text-lg">
          One tap to join campus season. No pace requirement, no fee to show up — just be at the
          start line.
        </p>

        <div className="mt-10 w-full max-w-sm space-y-3" data-magnetic data-cursor-hover>
          {googleConfigured ? <GoogleSignInButton /> : <GoogleNotConfiguredNotice />}
          {stravaConfigured ? <StravaSignInButton /> : <StravaNotConfiguredNotice />}
        </div>

        <p className="mt-6 max-w-xs text-xs leading-relaxed text-white/40">
          By joining you agree to run at your own pace and cheer on everyone slower and faster
          than you.
        </p>
      </div>

      <footer className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 pb-8 text-xs text-white/40">
        <span className="tracking-wide">ICHOR — a campus-exclusive social fitness battleground.</span>
      </footer>
    </section>
  );
}
