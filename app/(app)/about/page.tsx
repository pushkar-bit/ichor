"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { IchorMark } from "@/components/ui/IchorMark";
import { Flame, Users, Trophy, Map, Heart, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-midnight text-foreground">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-momentum/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-60 -left-40 w-[400px] h-[400px] rounded-full bg-afterrun/10 blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 pt-20 pb-32 relative">
          <FadeIn delay={0}>
            <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-momentum bg-momentum/10 border border-momentum/20 rounded-full px-4 py-1.5 mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-momentum animate-pulse" />
              Running Community · Est. 2025
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="font-display italic font-bold text-[clamp(3rem,10vw,7rem)] leading-[0.9] tracking-tight mb-8">
              Turn Sweat
              <br />
              <span className="text-gradient-momentum">Into Lore.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-xl text-white/60 max-w-2xl leading-relaxed">
              ICHOR was created with a simple belief: meaningful communities are built
              through shared experiences. More than a running club — it&apos;s a space where
              people come together to challenge themselves, support one another, and form
              genuine connections.
            </p>
          </FadeIn>

          {/* Stats row */}
          <FadeIn delay={0.35}>
            <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg">
              {[
                { value: "∞", label: "Runs logged" },
                { value: "6", label: "Leaderboards" },
                { value: "1", label: "Community" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-display italic font-bold text-4xl text-momentum">{s.value}</p>
                  <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── BRAND STORY ───────────────────────────────────────────────────── */}
      <section className="border-t border-border-ichor">
        <div className="max-w-5xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-start">
          <FadeIn>
            <div className="sticky top-24">
              <SectionLabel>Brand Story</SectionLabel>
              <h2 className="font-display italic font-bold text-5xl leading-tight mb-6">
                Built on earned achievement
              </h2>
              <div className="w-12 h-1 bg-momentum rounded-full" />
            </div>
          </FadeIn>
          <div className="space-y-6">
            <FadeIn delay={0.1}>
              <p className="text-white/70 leading-relaxed text-lg">
                ICHOR was created with a simple belief:{" "}
                <span className="text-momentum font-medium">
                  meaningful communities are built through shared experiences.
                </span>{" "}
                More than a running club, it is a space where people come together to challenge
                themselves, support one another, and form genuine connections. Every run becomes
                an opportunity to meet like-minded individuals, celebrate progress, and discover
                a{" "}
                <span className="text-afterrun font-medium">
                  sense of belonging rooted in movement and purpose.
                </span>
              </p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="text-white/70 leading-relaxed text-lg">
                Built on the values of ambition, inclusivity, and earned achievement, ICHOR
                inspires its members to go{" "}
                <span className="text-momentum font-medium">beyond the ordinary.</span> From
                everyday training sessions to bold challenges and unforgettable events, the club
                creates moments that strengthen both individuals and the community. Here, every
                milestone is shared, every effort is celebrated, and every member contributes to
                a culture that continues to grow with every step.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── LOGO CONCEPT ──────────────────────────────────────────────────── */}
      <section className="border-t border-border-ichor bg-midnight-raised">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Logo display */}
            <FadeIn>
              <div className="relative flex items-center justify-center h-72 bg-midnight rounded-3xl border border-border-ichor overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-momentum/10 via-transparent to-afterrun/10" />
                <motion.div
                  animate={{ scale: [1, 1.04, 1], rotate: [0, 1, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <IchorMark className="w-40 h-48 text-momentum" />
                </motion.div>
              </div>
            </FadeIn>
            {/* Text */}
            <div className="space-y-6">
              <FadeIn>
                <SectionLabel>Logo Concept</SectionLabel>
                <h2 className="font-display italic font-bold text-4xl leading-tight mb-4">
                  The mark of movement
                </h2>
              </FadeIn>
              <FadeIn delay={0.1}>
                <p className="text-white/70 leading-relaxed">
                  The ICHOR logo is inspired by the brand&apos;s namesake — Ichor, the mythical
                  golden fluid said to flow through the veins of the gods. Rather than
                  illustrating the concept literally, the symbol abstracts it into a singular
                  fluid form that represents continuous movement, transformation, and growth.
                  The organic silhouette reflects the idea that every drop of effort
                  contributes to something greater, turning individual actions into collective
                  achievement.
                </p>
              </FadeIn>
              <FadeIn delay={0.2}>
                <p className="text-white/70 leading-relaxed">
                  The form expands from a single point into a bold, unified shape, symbolising
                  how a community grows — one individual becoming many, one story becoming a
                  shared culture. Its flowing geometry conveys motion without relying on
                  conventional running imagery, creating a distinctive mark that embodies
                  belonging, ambition, and the club&apos;s philosophy of turning sweat into
                  something legendary.
                </p>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ── OUR VALUES ────────────────────────────────────────────────────── */}
      <section className="border-t border-border-ichor">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <FadeIn>
            <SectionLabel>Our Values</SectionLabel>
            <h2 className="font-display italic font-bold text-5xl mb-16">What drives us</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v, i) => (
              <FadeIn key={v.title} delay={i * 0.08}>
                <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-6 hover:border-momentum/40 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${v.iconBg}`}>
                    <v.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{v.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{v.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE SPIRIT ────────────────────────────────────────────────────── */}
      <section className="border-t border-border-ichor bg-midnight-raised overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 py-24 relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <IchorMark className="w-[600px] h-auto" />
          </div>
          <FadeIn>
            <blockquote className="relative text-center max-w-3xl mx-auto">
              <p className="font-display italic font-bold text-[clamp(2rem,6vw,4.5rem)] leading-tight text-gradient-momentum">
                &ldquo;Every drop of effort contributes to something greater.&rdquo;
              </p>
              <footer className="mt-6 text-sm text-white/40 uppercase tracking-widest">
                — The ICHOR Philosophy
              </footer>
            </blockquote>
          </FadeIn>
        </div>
      </section>

      {/* ── FOUNDERS ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border-ichor">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <FadeIn>
            <SectionLabel>The Team</SectionLabel>
            <h2 className="font-display italic font-bold text-5xl mb-4">Built by runners,<br />for runners</h2>
            <p className="text-white/50 max-w-xl mb-16">
              ICHOR was founded by developers Pushkar Jain and Om Yadav, supported by a core team obsessed with turning campus fitness culture into something legendary.
            </p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FOUNDERS.map((f, i) => (
              <FadeIn key={f.name} delay={i * 0.1}>
                <FounderCard founder={f} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRAND IDENTITY ────────────────────────────────────────────────── */}
      <section className="border-t border-border-ichor bg-midnight-raised">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <FadeIn>
            <SectionLabel>Brand Identity</SectionLabel>
            <h2 className="font-display italic font-bold text-5xl mb-16">Colour & Type</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-12">
            {/* Colours */}
            <FadeIn>
              <h3 className="text-sm uppercase tracking-widest text-white/40 mb-6">Palette</h3>
              <div className="space-y-3">
                {PALETTE.map((c) => (
                  <div key={c.name} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: c.hex }} />
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-white/40 font-mono">{c.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
            {/* Typography */}
            <FadeIn delay={0.1}>
              <h3 className="text-sm uppercase tracking-widest text-white/40 mb-6">Typography</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-white/30 mb-2 uppercase tracking-wider">Display</p>
                  <p className="font-display italic font-bold text-4xl">Barlow Condensed</p>
                  <p className="font-display italic font-bold text-4xl text-momentum">Italic Bold</p>
                </div>
                <div>
                  <p className="text-xs text-white/30 mb-2 uppercase tracking-wider">Body</p>
                  <p className="font-sans text-lg font-light">Poppins Light</p>
                  <p className="font-sans text-lg font-medium">Poppins Medium</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-border-ichor overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 py-32 text-center relative">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-momentum/10 blur-[80px] rounded-full pointer-events-none" />
          <FadeIn>
            <IchorMark className="w-16 h-20 text-momentum mx-auto mb-8" />
            <h2 className="font-display italic font-bold text-[clamp(2.5rem,8vw,5rem)] leading-tight mb-6">
              Your sweat.<br />
              <span className="text-gradient-momentum">Your lore.</span>
            </h2>
            <p className="text-white/50 max-w-md mx-auto text-lg mb-10">
              Every run you log, every territory you claim, every leaderboard you climb —
              it all becomes part of the ICHOR story.
            </p>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-momentum mb-4">
      <span className="w-4 h-px bg-momentum" />
      {children}
    </div>
  );
}

function FadeIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94], delay }}
    >
      {children}
    </motion.div>
  );
}

function FounderCard({ founder }: { founder: (typeof FOUNDERS)[number] }) {
  return (
    <div className="bg-midnight-raised border border-border-ichor rounded-2xl overflow-hidden hover:border-momentum/40 transition-colors">
      {/* Photo placeholder / image */}
      <div
        className="h-48 flex items-center justify-center relative overflow-hidden"
        style={{ background: founder.gradient }}
      >
        {founder.image ? (
          <img src={founder.image} alt={founder.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 30% 70%, #ae93f4 0%, transparent 60%),
                  radial-gradient(circle at 70% 30%, #fda2de 0%, transparent 60%)`,
              }}
            />
            <div className="relative w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
              <span className="font-display italic font-bold text-2xl text-white">
                {founder.initials}
              </span>
            </div>
            <div className="absolute bottom-3 right-3">
              <span className="text-[10px] font-medium text-white/40 bg-black/30 rounded-full px-2 py-0.5 backdrop-blur-sm">
                Photo coming soon
              </span>
            </div>
          </>
        )}
      </div>
      {/* Info */}
      <div className="p-5">
        <h3 className="font-semibold text-lg">{founder.name}</h3>
        <p className="text-xs text-momentum uppercase tracking-widest mb-2">{founder.role}</p>
        <p className="text-sm text-white/50 leading-relaxed">{founder.bio}</p>
      </div>
    </div>
  );
}

// ── DATA ───────────────────────────────────────────────────────────────────

const VALUES = [
  {
    title: "Ambition",
    desc: "We celebrate the pursuit of more — faster splits, longer distances, higher leaderboard ranks. Complacency has no place here.",
    icon: Flame,
    iconBg: "bg-momentum/15 text-momentum",
  },
  {
    title: "Inclusivity",
    desc: "Whether you run your first 5K or your tenth marathon, ICHOR is your home. Every pace is a valid pace.",
    icon: Heart,
    iconBg: "bg-afterrun/15 text-afterrun",
  },
  {
    title: "Earned Achievement",
    desc: "Nothing is handed here. Every badge, every territory, every rank on the leaderboard is earned through real sweat.",
    icon: Trophy,
    iconBg: "bg-lime/15 text-lime",
  },
  {
    title: "Community",
    desc: "Clans, pacts, head-to-heads — we build bonds through movement. Your rival today is your pacer tomorrow.",
    icon: Users,
    iconBg: "bg-momentum/15 text-momentum",
  },
  {
    title: "Territory",
    desc: "Campus is your arena. Tag zones, defend them, attack rivals. Movement has consequence in ICHOR.",
    icon: Map,
    iconBg: "bg-afterrun/15 text-afterrun",
  },
  {
    title: "Energy",
    desc: "ICHOR flows with the energy of people who show up. Every post, every run, every comment charges the collective.",
    icon: Zap,
    iconBg: "bg-ignite/15 text-ignite",
  },
];

const FOUNDERS = [
  {
    name: "Pushkar Jain",
    initials: "PJ",
    role: "Co-Founder & Developer",
    bio: "Obsessed with building products that make people move. Believes every campus needs a fitness battleground.",
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
    image: "/founder-1.jpg",
  },
  {
    name: "Om Yadav",
    initials: "OY",
    role: "Co-Founder & Developer",
    bio: "Passionate about pushing limits and turning ideas into reality. Drives the technical vision of ICHOR.",
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
    image: "/founder-2.jpg",
  },
  {
    name: "The Core Team",
    initials: "IC",
    role: "Core Contributors",
    bio: "Abhinav Sukhwal, Rudraksha Baragi, and Samridhi Negi. A squad of builders, runners, and campus culture obsessives making ICHOR real.",
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
    image: undefined,
  },
];

const PALETTE = [
  { name: "Momentum", hex: "#ae93f4" },
  { name: "Afterrun", hex: "#fda2de" },
  { name: "Midnight", hex: "#000000" },
  { name: "Lime", hex: "#d7f24c" },
  { name: "Ignite", hex: "#ff5e1a" },
];
