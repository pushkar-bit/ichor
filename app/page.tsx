import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { IchorLogo, IchorMark } from "@/components/ui/IchorMark";
import { Flame, Map, Trophy, MessageCircle, Users, Camera, ArrowRight } from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/feed");

  return (
    <div className="bg-midnight min-h-screen">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <IchorLogo textClassName="text-2xl" />
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm text-white/70 hover:text-white px-4 py-2">
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-semibold bg-momentum text-midnight px-4 py-2 rounded-full hover:bg-momentum-dim transition-colors"
          >
            Join ICHOR
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-momentum/20 blur-3xl" />
        <div className="absolute top-40 -left-32 w-80 h-80 rounded-full bg-afterrun/10 blur-3xl" />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-24 relative">
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-lime bg-lime/10 border border-lime/20 rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-lime" />
            Campus season is live
          </div>
          <h1 className="font-display italic font-bold text-6xl sm:text-8xl leading-[0.95] tracking-tight mb-6">
            Sweat.
            <br />
            <span className="text-gradient-momentum">Post.</span>
            <br />
            Dominate.
          </h1>
          <p className="text-lg text-white/60 max-w-xl mb-10">
            A community built on movement, belonging, and earned experiences. Import your runs,
            post them, get judged by the club, and fight for territory using your stats.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-momentum text-midnight font-semibold px-6 py-3.5 rounded-full hover:bg-momentum-dim transition-colors"
            >
              Turn sweat into lore <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 border border-border-ichor text-white/80 font-medium px-6 py-3.5 rounded-full hover:border-momentum/50 transition-colors"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Core loop */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px flex-1 bg-border-ichor" />
          <span className="text-xs uppercase tracking-widest text-white/40">The core loop</span>
          <div className="h-px flex-1 bg-border-ichor" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {["Run", "Import", "Post", "Battle"].map((step, i) => (
            <div key={step} className="relative">
              <div className="text-5xl font-display italic font-bold text-white/10 mb-2">
                0{i + 1}
              </div>
              <div className="font-semibold text-lg -mt-8">{step}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <FeatureCard
          icon={<Camera className="w-5 h-5" />}
          accent="momentum"
          title="Import, don't track"
          desc="Sync from health apps or upload a screenshot from Strava, Garmin, or Nike Run Club — AI extracts your stats."
        />
        <FeatureCard
          icon={<Flame className="w-5 h-5" />}
          accent="ignite"
          title="Diet Honesty Card"
          desc="Log what you ate. Clean eating earns integrity points, cheat days show publicly and cost you leaderboard score."
        />
        <FeatureCard
          icon={<Map className="w-5 h-5" />}
          accent="afterrun"
          title="Territory battles"
          desc="Tag a campus zone when you post. Better stats than the current owner? You trigger an automatic attack."
        />
        <FeatureCard
          icon={<Trophy className="w-5 h-5" />}
          accent="lime"
          title="Six leaderboards"
          desc="Calorie King, Grind Streak, Pace God, Distance Destroyer, Integrity Champion, and Clan Dominance."
        />
        <FeatureCard
          icon={<Users className="w-5 h-5" />}
          accent="momentum"
          title="Clans & diet pacts"
          desc="Squad up with up to 10 members, hold territory together, and set weekly diet challenges."
        />
        <FeatureCard
          icon={<MessageCircle className="w-5 h-5" />}
          accent="afterrun"
          title="Coach Dhruv"
          desc="Your AI performance coach reads your last 30 days and tells you exactly how to climb the board."
        />
      </section>

      <footer className="border-t border-border-ichor">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <IchorMark className="w-6 h-7 text-white/30" />
          <p className="text-xs text-white/30">ICHOR — a campus-exclusive social fitness battleground.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: "momentum" | "afterrun" | "lime" | "ignite";
}) {
  const accentClasses: Record<string, string> = {
    momentum: "bg-momentum/15 text-momentum",
    afterrun: "bg-afterrun/15 text-afterrun",
    lime: "bg-lime/15 text-lime",
    ignite: "bg-ignite/15 text-ignite",
  };
  return (
    <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-6 hover:border-momentum/30 transition-colors">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${accentClasses[accent]}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
    </div>
  );
}
