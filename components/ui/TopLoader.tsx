"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Global top progress bar.
 *
 * The App Router gives no built-in feedback while a server-rendered page is
 * loading — you click a link and the old page just sits there until the new one
 * is ready. This drives a manual bar: a capture-phase click listener on internal
 * links starts it, and a change in pathname/searchParams (the navigation actually
 * committing) finishes it. Pure client state — no server components involved.
 *
 * Must be rendered inside <Suspense> because it reads useSearchParams(); the
 * boundary keeps it from opting pages out of static rendering.
 */

const TRICKLE_CEILING = 0.9; // never reach 100% until the route actually commits
const SAFETY_MS = 8000; // give up trickling after this long (stuck / cancelled nav)

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0); // 0..1
  const [visible, setVisible] = useState(false);

  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const clearTimers = () => {
    if (trickleRef.current) clearInterval(trickleRef.current);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    if (safetyRef.current) clearTimeout(safetyRef.current);
    trickleRef.current = fadeRef.current = safetyRef.current = null;
  };

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setProgress(1);
    fadeRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 240);
  }, []);

  const start = useCallback(() => {
    if (activeRef.current) return; // already running
    activeRef.current = true;
    clearTimers();
    setVisible(true);
    setProgress(0.08);
    trickleRef.current = setInterval(() => {
      setProgress((p) => (p >= TRICKLE_CEILING ? p : p + Math.max((TRICKLE_CEILING - p) * 0.12, 0.004)));
    }, 180);
    safetyRef.current = setTimeout(() => finish(), SAFETY_MS);
  }, [finish]);

  // Navigation committed (route changed) → complete the bar.
  useEffect(() => {
    finish();
    // pathname/searchParams are the completion signal
  }, [pathname, searchParams, finish]);

  // Start on internal-link clicks (capture phase so we see it before React handles it).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      try {
        const dest = new URL(href, window.location.href);
        if (dest.origin !== window.location.origin) return; // external
        if (dest.pathname === window.location.pathname && dest.search === window.location.search) return; // same page
      } catch {
        return;
      }
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  // Browser back/forward.
  useEffect(() => {
    window.addEventListener("popstate", start);
    return () => window.removeEventListener("popstate", start);
  }, [start]);

  useEffect(() => () => clearTimers(), []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        insetInline: 0,
        top: 0,
        height: 3,
        zIndex: 2147483647,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          background: "var(--ichor-momentum)",
          boxShadow: "0 0 10px var(--ichor-momentum), 0 0 5px var(--ichor-momentum)",
          borderRadius: "0 3px 3px 0",
          transition: "width 0.18s ease-out, opacity 0.24s ease",
          opacity: progress >= 1 ? 0 : 1,
        }}
      />
    </div>
  );
}
