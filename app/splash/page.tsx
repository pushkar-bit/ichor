"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

/**
 * ICHOR Splash Animation Screen
 * ──────────────────────────────────────────────────────────────────────────
 * Route: /splash  — Outside the (app) group, NavShell is NEVER mounted.
 *
 * Triggers:
 *   A — GoogleSignInButton  → router.push('/splash')   (returning user)
 *   B — Onboarding submit   → window.location.href='/splash' (new user)
 *   C — NavShell logo click → router.push('/splash')
 *
 * Media: served via /api/public/media/[file] which handles HTTP Range
 *   requests (Turbopack's public/ serving does not support Range headers).
 *   /api/public/media/anim  →  public/anim.mp4   (video/mp4,  ~10s)
 *   /api/public/media/logo  →  public/logo.mp3   (audio/mpeg, ~10s)
 *
 * Redirect: window.location.replace('/feed') — hard navigation, instant,
 *   no React router queue delay, /splash removed from history stack.
 *
 * Safety timeout: 15s (well past the 10s animation).
 * Mute toggle: controls <audio> muted property, default = unmuted (plays).
 * Mobile layout: 16:9 aspect ratio box centred on black.
 * Desktop layout: fullscreen cover.
 */

const SAFETY_TIMEOUT_MS = 15_000; // 10s animation + 5s buffer

export default function SplashPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasNavigatedRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // default: audio ON

  // ── Immediate redirect to /feed ──────────────────────────────────────────
  // Use window.location.replace (hard nav) — router.replace goes through
  // React's navigation queue and introduces a visible delay. Hard nav is
  // instant and removes /splash from the browser history stack.
  const goToFeed = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    try {
      const audio = audioRef.current;
      if (audio) { audio.pause(); audio.currentTime = 0; }
    } catch { /* ignore */ }

    window.location.replace("/feed");
  }, []);

  // ── Toggle mute on the audio element ────────────────────────────────────
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  }, []);

  // ── Mount effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    // ── Back-gesture block ─────────────────────────────────────────────────
    history.pushState(null, "", "/splash");
    const blockBack = () => {
      if (!hasNavigatedRef.current) history.pushState(null, "", "/splash");
    };
    window.addEventListener("popstate", blockBack);

    // ── Safety timeout ─────────────────────────────────────────────────────
    safetyTimerRef.current = setTimeout(goToFeed, SAFETY_TIMEOUT_MS);

    // ── Start playback ─────────────────────────────────────────────────────
    if (video) video.play().catch(() => null);
    if (audio) audio.play().catch(() => null);

    return () => {
      window.removeEventListener("popstate", blockBack);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
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
      {/* ── VIDEO: desktop = fullscreen cover, mobile = 16:9 centred box ── */}
      <AnimatePresence>
        {!videoFailed && (
          <motion.video
            key="splash-video"
            ref={videoRef}
            src="/api/public/media/anim"
            muted        /* Required for cross-browser autoplay policy */
            playsInline  /* Prevents full-screen hijack on iOS Safari */
            autoPlay
            preload="auto"
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onEnded={goToFeed}
            onError={() => setVideoFailed(true)}
            style={{
              // Desktop: fullscreen cover
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              pointerEvents: "none",
            }}
            // On mobile (≤768px) override via className below
            className="splash-video"
          />
        )}
      </AnimatePresence>

      {/* ── CSS FALLBACK (video failed to load) ─────────────────────────── */}
      <AnimatePresence>
        {videoFailed && (
          <motion.div
            key="splash-fallback"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <motion.svg
              viewBox="0 0 100 120"
              fill="#ae93f4"
              style={{ width: 80, height: 96 }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
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

      {/* ── AUDIO (hidden, full volume, default unmuted) ─────────────────── */}
      <audio
        ref={audioRef}
        src="/api/public/media/logo"
        preload="auto"
        style={{ display: "none" }}
      />

      {/* ── MUTE / UNMUTE BUTTON ─────────────────────────────────────────── */}
      {/* Bottom-right corner. Visible throughout playback.                  */}
      {/* Default: audio plays. Click to mute. Click again to unmute.        */}
      <motion.button
        onClick={toggleMute}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        title={isMuted ? "Unmute" : "Mute"}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          zIndex: 10000,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#ffffff",
        }}
      >
        {isMuted
          ? <VolumeX size={20} />
          : <Volume2 size={20} />
        }
      </motion.button>

      {/* ── INLINE STYLES for responsive video layout ───────────────────── */}
      <style>{`
        /* Mobile: 16:9 aspect ratio box, centred on pure black background   */
        @media (max-width: 767px) {
          .splash-video {
            position: relative !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            aspect-ratio: 16 / 9;
            object-fit: contain !important;
          }
        }
      `}</style>
    </div>
  );
}
