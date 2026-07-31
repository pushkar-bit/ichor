"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LenisProvider, useLenis } from "@/lib/landing/lenis-context";

gsap.registerPlugin(ScrollTrigger);

function LenisEngine() {
  const { register } = useLenis();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    register(lenis);
    lenis.on("scroll", ScrollTrigger.update);

    // gsap.ticker.lagSmoothing(0) below reports the *real* elapsed time after any stall
    // (first WebGL frame, tab switch, etc.) instead of a smoothed-over estimate. Fed straight
    // into lenis.raf(), a single big tick can fast-forward an in-progress eased scrollTo by a
    // large fraction of its duration in one step — an animated scrollTo(...) then "jumps"
    // instead of visibly playing. Keep our own capped virtual clock for Lenis so one janky
    // frame only ever advances its animations by a normal frame's worth.
    let virtualElapsedMs = 0;
    const ticker = (_time: number, deltaMs: number) => {
      virtualElapsedMs += Math.min(deltaMs, 100);
      lenis.raf(virtualElapsedMs);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      register(null);
      gsap.ticker.remove(ticker);
      lenis.destroy();
    };
  }, [register]);

  return null;
}

/** Scoped to the landing page only — the rest of the app (feed, map, etc.) keeps native scroll. */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <LenisProvider>
      <LenisEngine />
      {children}
    </LenisProvider>
  );
}
