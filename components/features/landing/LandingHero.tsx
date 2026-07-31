"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = ["/ TERRITORY CLAIMING", "/ POINTS ECONOMY", "/ CLAN WARFARE"];

/**
 * Hero copy layered over the start of #scroll-track (the particle logo->kangaroo->runner
 * sequence had no text at all before this — fine as a pure visual, but a first-time visitor
 * had nothing telling them what ICHOR even is). Fades out over the same first-25% scroll
 * window ScrollCue already uses, so it clears out of the way once the morph gets going.
 */
export default function LandingHero() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tween = gsap.to(el, {
      opacity: 0,
      y: -24,
      ease: "none",
      scrollTrigger: {
        trigger: "#scroll-track",
        start: "top top",
        end: "+=22%",
        scrub: true,
      },
    });
    if (reducedMotion) tween.progress(1).pause();

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between px-5 pt-24 pb-28 sm:px-8 sm:pt-28 md:px-12"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        {FEATURES.map((f) => (
          <span
            key={f}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/70 drop-shadow-md"
          >
            {f}
          </span>
        ))}
      </div>

      <div className="max-w-xl">
        <p className="mb-4 inline-block border-l-2 border-momentum bg-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white/85 backdrop-blur-md">
          A Campus Fitness Battleground
        </p>
        <h1 className="text-balance font-display italic text-5xl font-bold leading-[0.95] tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
          Sweat. Post.
          <br />
          Dominate.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 drop-shadow-md sm:text-lg">
          Every run claims ground. Hold it, grow it, defend it from rivals — solo or with a clan
          — while the leaderboard keeps score.
        </p>
      </div>
    </div>
  );
}
