"use client";

import { useEffect, useRef } from "react";

const HOVER_SELECTOR = 'a, button, [role="button"], [data-cursor-hover]';
const MAGNETIC_SELECTOR = "[data-magnetic]";
const MAGNETIC_STRENGTH = 0.35;

// Distance (px) the pointer must travel before the trailing shoe takes its next step — this
// is what gives the running cadence: fast swipes = quick short steps, slow drags = long,
// unhurried strides.
const STRIDE = 24;
const LATERAL_OFFSET = 6;
const MIN_STEP_MS = 90;
const MAX_STEP_MS = 230;

function ShoeGlyph() {
  return (
    <svg viewBox="0 0 120 50" className="block h-full w-full" xmlns="http://www.w3.org/2000/svg">
      {/* thick stacked midsole */}
      <path
        d="M4 28 L110 26
           Q120 27 118 33
           Q116 39 106 40
           L14 40
           Q3 39 4 32 Z"
        fill="var(--ichor-afterrun)"
      />
      {/* upper: vertical heel wall -> collar notch -> vamp -> tapered toe point */}
      <path
        d="M10 12
           L8 30
           L104 28
           L116 21
           L92 9
           C77 5 60 6 46 11
           C36 5 20 6 10 12 Z"
        fill="var(--foreground)"
      />
      {/* speed stripe over the vamp */}
      <path d="M44 13 L60 8.5 L66 17.5 L50 22 Z" fill="var(--ichor-afterrun)" />
    </svg>
  );
}

/** Scoped to the landing page only — the rest of the app keeps the native cursor. */
export default function CustomCursor() {
  const shoeARef = useRef<HTMLDivElement | null>(null);
  const shoeBRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!canHover) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const shoeA = shoeARef.current;
    const shoeB = shoeBRef.current;
    if (!shoeA || !shoeB) return;

    document.body.classList.add("cursor-none-custom");

    const shoes = [shoeA, shoeB];
    let revealed = false;
    let lastStep = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let lastStepAt = performance.now();
    let stepIndex = 0;

    const place = (
      el: HTMLDivElement,
      x: number,
      y: number,
      facingLeft: boolean,
      tiltDeg: number,
      durationMs: number,
    ) => {
      el.style.transitionDuration = `${durationMs}ms`;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scaleX(${
        facingLeft ? -1 : 1
      }) rotate(${tiltDeg}deg)`;
    };

    // Seed both shoes at the same spot so the first real step doesn't fly in from a stale position.
    place(shoeA, lastStep.x, lastStep.y, false, 0, 0);
    place(shoeB, lastStep.x, lastStep.y, false, 0, 0);

    const onMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const hovering = !!target?.closest?.(HOVER_SELECTOR);
      shoeA.classList.toggle("is-hover", hovering);
      shoeB.classList.toggle("is-hover", hovering);

      if (!revealed) {
        revealed = true;
        lastStep = { x: e.clientX, y: e.clientY };
        lastStepAt = performance.now();
        place(shoeA, e.clientX, e.clientY, false, 0, 0);
        place(shoeB, e.clientX, e.clientY, false, 0, 0);
        shoeA.style.opacity = "1";
        shoeB.style.opacity = "1";
        return;
      }

      const dx = e.clientX - lastStep.x;
      const dy = e.clientY - lastStep.y;
      const dist = Math.hypot(dx, dy);
      if (dist < STRIDE) return;

      const now = performance.now();
      const elapsed = now - lastStepAt;
      // Faster travel -> quicker foot turnover, within sane bounds.
      const speed = dist / Math.max(elapsed, 1); // px/ms
      const duration = Math.max(MIN_STEP_MS, Math.min(MAX_STEP_MS, 260 - speed * 90));

      const nx = dx / dist;
      const ny = dy / dist;
      const perpX = -ny;
      const perpY = nx;
      const side = stepIndex % 2 === 0 ? 1 : -1;

      const footX = e.clientX + perpX * LATERAL_OFFSET * side;
      const footY = e.clientY + perpY * LATERAL_OFFSET * side;
      const facingLeft = nx < 0;
      const tiltDeg = (Math.atan2(ny, Math.abs(nx)) * 180) / Math.PI;

      place(shoes[stepIndex % 2], footX, footY, facingLeft, tiltDeg, duration);

      stepIndex += 1;
      lastStep = { x: e.clientX, y: e.clientY };
      lastStepAt = now;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    if (reducedMotion) {
      // Skip stride physics entirely; just track the pointer 1:1.
      const onMoveOnly = (e: MouseEvent) => {
        place(shoeA, e.clientX, e.clientY, false, 0, 0);
        shoeA.style.opacity = "1";
        shoeB.style.opacity = "0";
      };
      window.removeEventListener("mousemove", onMouseMove);
      window.addEventListener("mousemove", onMoveOnly, { passive: true });
      return () => {
        document.body.classList.remove("cursor-none-custom");
        window.removeEventListener("mousemove", onMoveOnly);
      };
    }

    // Magnetic pull for CTA elements — independent of the shoe cursor.
    let activeMagnetic: HTMLElement | null = null;
    const onMagneticMove = (e: MouseEvent) => {
      if (!activeMagnetic) return;
      const rect = activeMagnetic.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      activeMagnetic.style.transform = `translate(${(e.clientX - cx) * MAGNETIC_STRENGTH}px, ${
        (e.clientY - cy) * MAGNETIC_STRENGTH
      }px)`;
    };
    window.addEventListener("mousemove", onMagneticMove, { passive: true });

    const detachers: Array<() => void> = [];
    document.querySelectorAll(MAGNETIC_SELECTOR).forEach((el) => {
      const target = el as HTMLElement;
      const enter = () => {
        activeMagnetic = target;
      };
      const leave = () => {
        if (activeMagnetic === target) activeMagnetic = null;
        target.style.transform = "";
      };
      target.addEventListener("mouseenter", enter);
      target.addEventListener("mouseleave", leave);
      detachers.push(() => {
        target.removeEventListener("mouseenter", enter);
        target.removeEventListener("mouseleave", leave);
      });
    });

    return () => {
      document.body.classList.remove("cursor-none-custom");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousemove", onMagneticMove);
      detachers.forEach((fn) => fn());
    };
  }, []);

  return (
    <>
      <div
        ref={shoeARef}
        className="shoe-cursor pointer-events-none fixed left-0 top-0 z-[100] h-3.5 w-8 opacity-0"
        aria-hidden="true"
      >
        <ShoeGlyph />
      </div>
      <div
        ref={shoeBRef}
        className="shoe-cursor pointer-events-none fixed left-0 top-0 z-[100] h-3.5 w-8 opacity-0"
        aria-hidden="true"
      >
        <ShoeGlyph />
      </div>
    </>
  );
}
