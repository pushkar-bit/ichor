"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

/**
 * ICHOR Splash Animation Screen
 * ──────────────────────────────────────────────────────────────────────────
 * Route: /splash  (top-level — outside the (app) group, so NavShell is
 *                  never mounted and the sidebar is never visible)
 *
 * Trigger A (Post-Login):   GoogleSignInButton → router.push('/splash')
 * Trigger B (New User):     Onboarding page    → window.location.href = '/splash'
 * Trigger C (Logo Click):   NavShell button    → router.push('/splash')
 *
 * Media:
 *   <video src="/anim.mp4" muted>   – muted is REQUIRED for cross-browser
 *                                      autoplay policy compliance
 *   <audio src="/logo.mp3">          – full-volume audio, separate element
 *   Both started simultaneously via Promise.all on mount.
 *
 * Lifecycle:
 *   video "ended"  →  pause audio  →  router.replace("/feed")
 *   video "error"  →  router.replace("/feed")   (graceful fallback)
 *   Safety timeout →  router.replace("/feed")   (in case ended never fires)
 *
 * Back-gesture guard:
 *   Pushes a duplicate history entry so popstate is swallowed — the user
 *   cannot navigate away mid-animation.
 */

const SAFETY_TIMEOUT_MS = 15_000; // max wait before force-redirect to /feed

export default function SplashPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasNavigatedRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Navigate to feed exactly once ───────────────────────────────────────
  const goToFeed = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    // Clear safety timer
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    // Stop & reset audio to free resources
    try {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    } catch {
      // ignore
    }

    // Replace so /splash is not in the history stack
    router.replace("/feed");
  }, [router]);

  // ── Mount effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    // Safety: if refs aren't ready, go straight to feed
    if (!video || !audio) {
      goToFeed();
      return;
    }

    // ── Back-gesture block ─────────────────────────────────────────────────
    history.pushState(null, "", "/splash");
    const blockBack = () => {
      if (!hasNavigatedRef.current) {
        history.pushState(null, "", "/splash");
      }
    };
    window.addEventListener("popstate", blockBack);

    // ── Safety timeout: redirect even if video never fires "ended" ─────────
    safetyTimerRef.current = setTimeout(goToFeed, SAFETY_TIMEOUT_MS);

    // ── Simultaneous video + audio playback ───────────────────────────────
    Promise.all([
      video.play().catch(() => null),   // muted video — rarely blocked
      audio.play().catch(() => null),   // audio — may be blocked by browser policy, soft-fail
    ]).catch(() => null);
    // Note: goToFeed is wired to video's onEnded / onError handlers in JSX,
    // so we don't need to handle the Promise result here.

    return () => {
      window.removeEventListener("popstate", blockBack);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      // Cleanup audio on unmount
      try {
        const audio = audioRef.current;
        if (audio) { audio.pause(); audio.currentTime = 0; }
      } catch { /* ignore */ }
    };
  }, [goToFeed]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeIn" }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000000",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* ── VIDEO LAYER ──────────────────────────────────────────────────── */}
      {/*  • muted      – required for autoplay in every browser             */}
      {/*  • playsInline – prevents full-screen hijack on iOS Safari         */}
      {/*  • controls=false + disablePictureInPicture – no native UI chrome  */}
      {/*  • onEnded → goToFeed  (primary completion signal)                 */}
      {/*  • onError → goToFeed  (fallback if file is missing / corrupt)     */}
      <video
        ref={videoRef}
        src="/anim.mp4"
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onEnded={goToFeed}
        onError={goToFeed}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",     // prevents any accidental touch/click on the video
        }}
      />

      {/* ── AUDIO LAYER ──────────────────────────────────────────────────── */}
      {/*  Separate <audio> element plays logo.mp3 at full volume while the  */}
      {/*  <video> above handles only the visual track (video is muted).     */}
      <audio
        ref={audioRef}
        src="/logo.mp3"
        preload="auto"
        style={{ display: "none" }}
      />
    </motion.div>
  );
}
