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

    const ticker = (time: number) => {
      lenis.raf(time * 1000);
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
