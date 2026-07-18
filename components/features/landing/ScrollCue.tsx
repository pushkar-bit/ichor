"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollCue() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      el.style.display = "none";
      return;
    }

    const tween = gsap.to(el, {
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: "#scroll-track",
        start: "top top",
        end: "+=25%",
        scrub: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2 text-white/40"
    >
      <span className="text-xs uppercase tracking-[0.4em]">Scroll</span>
      <span className="h-8 w-px animate-pulse bg-white/40" />
    </div>
  );
}
