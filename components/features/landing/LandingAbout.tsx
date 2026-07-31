"use client";

import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ROWS = [
  {
    title: "Territory",
    body: "Every GPS-verified run claims the ground it covers. Hold it and it earns you points just for existing — anyone crossing it, yours or a rival's failed attack, grows its value.",
  },
  {
    title: "Points",
    body: "Distance, pace, streaks, clean eating, battles won — every real effort compounds into one score. Nothing resets on you; the leaderboard just keeps climbing.",
  },
  {
    title: "Clans",
    body: "Bring your crew. Your clan's land becomes one collective empire on the map, with shared points — and 48-hour wars you can declare on rival clans.",
  },
];

/**
 * "Why ICHOR" — the section the particle-morph hero never explains anything in. Sits between
 * the scroll-track and #join, using the same reveal-on-scroll technique (GSAP ScrollTrigger)
 * already driving the rest of the landing page, rather than a second animation mechanism.
 */
export default function LandingAbout() {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const triggers = Array.from(targets).map((el, i) => {
      gsap.set(el, { y: 24, opacity: 0 });
      return ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () =>
          gsap.to(el, { y: 0, opacity: 1, duration: 0.7, ease: "power2.out", delay: (i % 4) * 0.08 }),
      });
    });

    return () => triggers.forEach((t) => t.kill());
  }, []);

  return (
    <section ref={rootRef} className="relative z-10 bg-midnight px-5 py-24 sm:px-8 md:px-12 md:py-32">
      <div className="mx-auto flex max-w-5xl flex-col gap-16 md:flex-row md:items-end md:justify-between md:gap-16">
        <div className="max-w-xl">
          {/* GSAP applies its reveal transform to this plain wrapper, not directly to the
              backdrop-blur badge below — that combination (inline-block + backdrop-filter +
              an animated transform on the same element) renders the badge's own text
              invisible in Chromium. */}
          <div data-reveal className="mb-4 inline-block">
            <p className="inline-block border-l-2 border-momentum bg-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white/85 backdrop-blur-md">
              Why ICHOR
            </p>
          </div>
          <h2 data-reveal className="text-balance font-display italic text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Not another
            <br />
            fitness app.
          </h2>
          <p data-reveal className="mt-6 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            Step counters don&apos;t care if you show up. ICHOR turns every run into a claim on
            real ground, judged by people who&apos;ll notice if you don&apos;t defend it.
          </p>
        </div>

        <div
          data-reveal
          className="w-full max-w-md rounded-2xl border border-border-ichor bg-white/5 px-5 backdrop-blur-md sm:px-6"
        >
          {ROWS.map((row, i) => (
            <div
              key={row.title}
              className={`flex gap-5 py-5 ${i < ROWS.length - 1 ? "border-b border-border-ichor" : ""}`}
            >
              <span className="font-mono text-[11px] tracking-[0.15em] text-white/45">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="group inline-flex items-center gap-1 text-base font-medium sm:text-lg">
                  {row.title}
                  <ChevronRight className="w-4 h-4 text-white/30 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-white/65">{row.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
