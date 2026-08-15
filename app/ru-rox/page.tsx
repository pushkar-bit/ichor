"use client";

import "./rurox.css";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  MapPin,
  Clock,
  Users,
  Route,
  Zap,
  Footprints,
  Dumbbell,
  RotateCw,
  MessageCircle,
  AtSign,
  ArrowUpRight,
  GraduationCap,
} from "lucide-react";
import { FadingVideo } from "@/components/ui/FadingVideo";
import { BlurText } from "@/components/ui/BlurText";

const WHATSAPP_URL = "https://chat.whatsapp.com/IXnXrKajDKN0zmhTc1pk57";
const INSTAGRAM_URL = "https://instagram.com/ichor.club";

export default function RuRoxPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <Hero />
      <Origin />
      <Explainer />
      <Course />
      <TrainCTA />
      <EventDetails />
      <ClosingCTA />
    </div>
  );
}

// ── NAV ──────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="fixed top-4 left-0 right-0 z-50 px-4 md:px-8 lg:px-16">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <span className="rurox-glass rounded-full w-12 h-12 flex items-center justify-center font-display italic font-bold text-lg shrink-0">
          RX
        </span>

        <div className="hidden md:flex items-center gap-1 rurox-glass rounded-full px-1.5 py-1.5">
          {[
            ["The Race", "#course"],
            ["Origin", "#origin"],
            ["Train", "#train"],
            ["Details", "#details"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="px-3 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              {label}
            </a>
          ))}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-white text-black text-sm font-semibold rounded-full px-4 py-2 whitespace-nowrap hover:bg-white/90 transition-colors"
          >
            Join Now
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        <Link
          href="/"
          className="rurox-glass rounded-full px-4 h-12 flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors shrink-0"
        >
          ICHOR
        </Link>
      </div>
    </nav>
  );
}

// ── HERO ─────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      <FadingVideo
        src="/videos/rurox-hero.mp4"
        className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-0 w-full h-full"
      />
      <div className="absolute inset-0 bg-black/35 z-[1]" />

      <div className="relative z-10 flex flex-col h-full pt-28 px-4">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <FadeIn delay={0.3}>
            <div className="rurox-glass rounded-full inline-flex items-center pl-1 pr-4 py-1 mb-8">
              <span className="bg-white text-black rounded-full px-3 py-1 text-xs font-semibold mr-3">
                ICHOR × Rishihood
              </span>
              <span className="text-sm text-white/90">A legacy race, run at dawn</span>
            </div>
          </FadeIn>

          <BlurText
            text="Jab Bhaago, Tabhi Savera"
            className="font-display italic font-bold text-white text-[clamp(2.75rem,10vw,6.5rem)] leading-[0.95] tracking-tight max-w-4xl"
          />

          <FadeIn delay={0.8}>
            <p className="mt-5 text-base md:text-lg text-white/70 max-w-xl">
              Dawn breaks only when you run. RU-Rox is ICHOR&apos;s Rock Zone Race — a hybrid
              run built for Rishihood University&apos;s new batch.
            </p>
          </FadeIn>

          <FadeIn delay={1.1}>
            <div className="flex items-center gap-4 mt-8">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rurox-glass-strong rounded-full px-6 py-3 text-sm font-medium text-white inline-flex items-center gap-2 hover:brightness-125 transition"
              >
                Join the Community
                <ArrowUpRight className="w-5 h-5" />
              </a>
              <a
                href="#origin"
                className="text-sm font-medium text-white/80 hover:text-white inline-flex items-center gap-2 transition-colors"
              >
                Read the story
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={1.3}>
            <div className="flex items-stretch gap-4 mt-10">
              {[
                { value: "3.6 km", label: "Total course distance" },
                { value: "4 + 4", label: "800m legs & grit stations" },
              ].map((s) => (
                <div key={s.label} className="rurox-glass rounded-2xl p-5 w-[170px]">
                  <p className="font-display italic font-bold text-3xl text-white leading-none">
                    {s.value}
                  </p>
                  <p className="text-xs text-white/60 mt-2">{s.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={1.4}>
          <div className="flex flex-col items-center gap-3 pb-10">
            <span className="rurox-glass rounded-full px-4 py-1.5 text-xs font-medium text-white/80">
              Neem Tree Ground · Rishihood University · 7:00 AM
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── ORIGIN ───────────────────────────────────────────────────────────────

function Origin() {
  return (
    <section id="origin" className="relative bg-black py-24 md:py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <SectionLabel>Where It Started</SectionLabel>
          <h2 className="font-display italic font-bold text-4xl md:text-5xl leading-tight mb-8">
            One fine day, someone asked: why does a run have to just be a run?
          </h2>
        </FadeIn>
        <div className="space-y-5 text-white/70 text-lg leading-relaxed">
          <FadeIn delay={0.1}>
            <p>
              RU-Rox didn&apos;t start as a proposal or a plan — it started as an offhand idea on
              an ordinary campus morning. Abhinav Sukhwal, one fine day, was watching the new
              batch shuffle through their first few weeks at Rishihood and thought about what a
              regular ICHOR run could become if it stopped being regular. Not just a timed loop
              around campus, but something that made people earn every single metre — a race
              where your legs and your grit both had to show up.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p>
              &ldquo;We can do something like this,&rdquo; he said — half a joke, half a dare to
              himself. That one line was enough to send the idea down the ICHOR group chat:
              what if a run wasn&apos;t just a run? What if it was broken up, again and again, by
              moments that forced you to stop, drop, and prove you had more left in the tank?
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p>
              The idea stuck. Sketches turned into a course. A course turned into a partnership
              with Rishihood University. And a throwaway line about &ldquo;something like
              this&rdquo; became RU-Rox — ICHOR&apos;s first Rock Zone Race, built from the
              ground up for the new batch, at Neem Tree Ground, at the hour before the campus
              wakes up.
            </p>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ── EXPLAINER: WHAT IS RU-ROX ───────────────────────────────────────────

function Explainer() {
  return (
    <section className="relative border-t border-white/10 bg-[#050208] py-24 md:py-32 px-6 overflow-hidden">
      <div className="absolute -top-40 right-0 w-[500px] h-[500px] rounded-full bg-momentum/10 blur-[140px] pointer-events-none" />
      <div className="max-w-3xl mx-auto relative">
        <FadeIn>
          <SectionLabel>What Is RU-Rox</SectionLabel>
          <h2 className="font-display italic font-bold text-4xl md:text-5xl leading-tight mb-8">
            An RU Rock Zone Race
          </h2>
        </FadeIn>
        <div className="space-y-6 text-white/70 text-lg leading-relaxed">
          <FadeIn delay={0.1}>
            <p>
              RU-Rox — short for the <span className="text-white font-medium">RU Rock Zone
              Race</span> — is ICHOR Run Club&apos;s legacy obstacle run, built in collaboration
              with Rishihood University. It is not a marathon, and it is not a bootcamp. It sits
              deliberately in between: a hybrid race where flat-out running and raw physical grit
              take turns testing you, leg after leg, until there&apos;s nothing left to hide
              behind but your own effort.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p>
              The format is simple to explain and brutal to run. Runners move through five
              individual running legs, each one broken up by a grit station in between — a
              short, sharp burst of strength work that has nothing to do with pace and everything
              to do with heart. You sprint, you grind, you sprint again. By the time the finish
              line is in sight, you&apos;ve been tested on speed, endurance, coordination, and
              sheer willpower — not just one of them.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p>
              RU-Rox is run at first light, because that is the whole point of it. &ldquo;Jab
              Bhaago, Tabhi Savera&rdquo; — dawn breaks only when you run — isn&apos;t just a
              tagline, it&apos;s the entire premise of the event. The race begins while campus is
              still half asleep, and every runner who crosses the finish line does so having
              earned the sunrise, not just watched it. There&apos;s something deliberately
              symbolic about that: the new batch showing up before the rest of the world is
              awake, choosing to sweat before choosing anything else that day.
            </p>
          </FadeIn>
          <FadeIn delay={0.4}>
            <p>
              This edition of RU-Rox belongs to the new batch. It is designed as a rite of
              passage — the first shared, sweated-through story a new class at Rishihood gets to
              tell together. Runners move through the course in waves, band by band, station by
              station, and every single finisher — not just the fastest — walks away with proof
              that they showed up and did the work. The fastest among them earn something a
              little extra, but RU-Rox was never built to be a race only the quick could win. It
              was built to be a race everyone could finish.
            </p>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ── THE COURSE ───────────────────────────────────────────────────────────

const STATIONS = [
  {
    icon: Zap,
    title: "Burpee Broad Jumps",
    desc: "Straight off the first 800m leg, no time to catch your breath. Drop, explode forward, repeat — pure full-body power to shake off any rhythm you thought you had.",
  },
  {
    icon: Footprints,
    title: "The Crawl",
    desc: "Low, military-style mesh nets pin you close to the ground. There's no jogging through this one — just elbows, knees, and the grit to keep moving forward, flat on the turf.",
  },
  {
    icon: Dumbbell,
    title: "Sandbag Lunges",
    desc: "A weighted sack on your shoulders and a stretch of ground that refuses to get shorter. Every lunge burns a little more than the last — this is where legs start negotiating.",
  },
  {
    icon: RotateCw,
    title: "Tire Flips",
    desc: "The final grit station before the last sprint. Heavy tires, end over end, across the field — a last full-body gut-check right before RU-Rox lets you run for the finish line.",
  },
];

function Course() {
  return (
    <section id="course" className="relative bg-black py-24 md:py-32 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <SectionLabel>The Course</SectionLabel>
          <h2 className="font-display italic font-bold text-4xl md:text-6xl leading-[0.95] mb-4 max-w-2xl">
            Four 800m legs.
            <br />
            Then sprint it home.
          </h2>
          <p className="text-white/50 max-w-xl mb-16 text-lg">
            Two laps of the 400m track between every station, four different tests of grit along
            the way, then a final 400m sprint to the line — 3.6 kilometres, start to finish.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {STATIONS.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.1}>
              <div className="rurox-glass rounded-[1.25rem] p-6 md:p-8 min-h-[220px] flex flex-col">
                <div className="w-11 h-11 rurox-glass rounded-xl flex items-center justify-center mb-6">
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display italic font-bold text-2xl md:text-3xl mb-3">
                  {s.title}
                </h3>
                <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-[38ch]">
                  {s.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── TRAIN CTA ────────────────────────────────────────────────────────────

function TrainCTA() {
  return (
    <section id="train" className="relative bg-black py-20 px-6 border-t border-white/10">
      <div className="max-w-3xl mx-auto text-center">
        <FadeIn>
          <div className="rurox-glass-strong rounded-[1.5rem] px-6 py-10 md:px-12 md:py-14">
            <GraduationCap className="w-8 h-8 text-momentum mx-auto mb-5" />
            <h2 className="font-display italic font-bold text-3xl md:text-4xl mb-3">
              Don&apos;t know where to start?
            </h2>
            <p className="text-white/60 max-w-md mx-auto mb-8">
              Vikas Yadav, ICHOR&apos;s AI coach, will build you a training plan for this exact
              course — whether you&apos;re a first-timer or chasing the champion patch.
            </p>
            <a
              href="/coach?topic=rurox"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold rounded-full px-6 py-3 hover:bg-white/90 transition-colors"
            >
              How to Train for RU-Rox
              <ArrowUpRight className="w-5 h-5" />
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── EVENT DETAILS ────────────────────────────────────────────────────────

function EventDetails() {
  const details = [
    { icon: MapPin, label: "Location", value: "Neem Tree Ground, Rishihood University" },
    { icon: Clock, label: "Start Time", value: "7:00 AM" },
    { icon: Users, label: "Open To", value: "The New Batch" },
    { icon: Route, label: "Distance", value: "3.6 km" },
  ];
  return (
    <section id="details" className="relative border-t border-white/10 bg-[#050208] py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {details.map((d) => (
              <div key={d.label} className="rurox-glass rounded-2xl p-5">
                <d.icon className="w-5 h-5 text-white/70 mb-4" />
                <p className="text-xs uppercase tracking-widest text-white/40 mb-1">{d.label}</p>
                <p className="font-display italic font-bold text-lg leading-tight">{d.value}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── CLOSING CTA ──────────────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section className="relative border-t border-white/10 bg-black py-28 md:py-36 px-6 text-center overflow-hidden">
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-momentum/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="relative max-w-2xl mx-auto">
        <FadeIn>
          <h2 className="font-display italic font-bold text-[clamp(2.5rem,8vw,5rem)] leading-tight mb-6">
            This is RU-Rox.
          </h2>
          <p className="text-white/60 text-lg mb-10">
            Dawn breaks only when you run. Join the community to catch the next drop, the next
            wave, the next start line.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold rounded-full px-6 py-3 hover:bg-white/90 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Join our WhatsApp Community
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rurox-glass rounded-full px-6 py-3 font-semibold text-white/90 hover:text-white transition-colors"
            >
              <AtSign className="w-5 h-5" />
              @ichor.club
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── SHARED BITS ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-momentum mb-4">
      <span className="w-4 h-px bg-momentum" />
      {children}
    </div>
  );
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
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
