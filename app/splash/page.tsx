"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ICHOR Splash Animation Screen
 * ──────────────────────────────────────────────────────────────────────────
 * Route: /splash  —  Outside the (app) group, so NavShell is NEVER mounted.
 *
 * Trigger A: GoogleSignInButton  → router.push('/splash')   (returning user)
 * Trigger B: Onboarding submit   → window.location.href='/splash' (new user)
 * Trigger C: NavShell logo click → router.push('/splash')
 *
 * Media playback:
 *   <video src="/anim.mp4" muted>   muted required for cross-browser autoplay
 *   <audio src="/logo.mp3">         full-volume audio via separate element
 *   Both launched simultaneously via Promise.all
 *
 * Fallback chain (each layer activates only if the previous fails):
 *   1. Full video + audio playback   (when real media files exist)
 *   2. Audio only (video error)      (if video file missing/corrupt)
 *   3. CSS logo pulse animation      (if both media fail)
 *   4. 13-second safety timeout      (3s buffer past the 10s animation)
 *
 * Both anim.mp4 and logo.mp3 are exactly 10 seconds.
 * Navigation fires on video 'ended' — never before the full 10s play.
 */

// 10-second animation + 3-second buffer. The video's onEnded is the
// primary trigger; this only fires if ended never comes (network stall etc.)
const SAFETY_TIMEOUT_MS = 13_000;

export default function SplashPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasNavigatedRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  // ── Navigate to /feed exactly once ──────────────────────────────────────
  const goToFeed = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    const audio = audioRef.current;
    if (audio) {
      try { audio.pause(); audio.currentTime = 0; } catch { /* ignore */ }
    }

    // replace() so /splash never appears in the browser back stack
    router.replace("/feed");
  }, [router]);

  // ── Main mount effect ─────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    // ── Back-gesture block ───────────────────────────────────────────────
    history.pushState(null, "", "/splash");
    const blockBack = () => {
      if (!hasNavigatedRef.current) history.pushState(null, "", "/splash");
    };
    window.addEventListener("popstate", blockBack);

    // ── Safety timeout ───────────────────────────────────────────────────
    safetyTimerRef.current = setTimeout(goToFeed, SAFETY_TIMEOUT_MS);

    // ── Start playback ───────────────────────────────────────────────────
    if (video && audio) {
      // Kick both simultaneously; soft-fail each independently
      video.play().catch(() => null);
      audio.play().catch(() => null);
    } else {
      // No refs ready — fall back to safety timer only
    }

    return () => {
      window.removeEventListener("popstate", blockBack);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      try {
        const audio = audioRef.current;
        if (audio) { audio.pause(); audio.currentTime = 0; }
      } catch { /* ignore */ }
    };
  }, [goToFeed]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000000",
        zIndex: 9999,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* ── VIDEO LAYER ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!videoFailed && (
          <motion.video
            key="splash-video"
            ref={videoRef}
            src="/anim.mp4"
            muted
            playsInline
            autoPlay
            preload="auto"
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onEnded={goToFeed}
            onError={() => {
              // Video unavailable — reveal fallback logo, audio still plays
              setVideoFailed(true);
            }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── FALLBACK CSS LOGO ANIMATION ──────────────────────────────────── */}
      {/* Shown only when the video file fails to load (e.g. not yet uploaded) */}
      <AnimatePresence>
        {videoFailed && (
          <motion.div
            key="splash-fallback"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {/* Pulsing ICHOR mark */}
            <motion.svg
              viewBox="0 0 100 120"
              fill="#ae93f4"
              style={{ width: 80, height: 96 }}
              animate={{
                scale: [1, 1.08, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <path d="M75 8C55 8 35 25 35 52c0 22 15 38 30 44-18-2-45-16-45-48C20 20 42 0 68 0c4 0 8 3 7 8z" />
            </motion.svg>
            <motion.span
              style={{
                fontFamily: "var(--font-barlow), sans-serif",
                fontStyle: "italic",
                fontWeight: 800,
                fontSize: "2.5rem",
                letterSpacing: "-0.01em",
                color: "#f5f3f6",
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              ICHOR
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AUDIO LAYER ─────────────────────────────────────────────────── */}
      {/* Separate <audio> element — plays logo.mp3 at full volume.          */}
      {/* The <video> above is muted (required for autoplay); audio is not.  */}
      {/* onEnded is NOT wired here — we rely on the VIDEO's ended event     */}
      {/* because both files should be the same duration.                    */}
      <audio
        ref={audioRef}
        src="/logo.mp3"
        preload="auto"
        style={{ display: "none" }}
      />
    </div>
  );
}
