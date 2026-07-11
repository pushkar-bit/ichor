"use client";

import { useEffect, useRef, useCallback, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, SkipForward } from "lucide-react";

/**
 * ICHOR Splash Animation Screen
 * ──────────────────────────────────────────────────────────────────────────
 * Route: /splash?to=<destination>
 *
 * Currently triggered ONLY from the "About" nav item in NavShell:
 *   NavShell About click → router.push('/splash?to=about') → animation plays
 *   → window.location.replace('/about')
 *
 * The `?to=` query param controls where the user lands after the animation.
 * Defaults to '/feed' if no param is present.
 *
 * Media (served via /api/public/media/[file] — handles HTTP Range requests):
 *   /api/public/media/anim  →  public/anim.mp4   (10 seconds)
 *   /api/public/media/logo  →  public/logo.mp3   (10 seconds)
 *   Both play simultaneously via .play() on mount.
 *
 * Redirect: window.location.replace(destination) on video 'ended'.
 *   Hard navigation = instant, no React router queue delay.
 *
 * Mobile: 16:9 aspect ratio box centred on black.
 * Desktop: fullscreen cover.
 * Mute button: glassmorphism, bottom-right, default = audio ON.
 */

const SAFETY_TIMEOUT_MS = 15_000;

const ALLOWED_DESTINATIONS: Record<string, string> = {
  about: "/about",
  feed: "/feed",
};

// ── Inner component (needs useSearchParams, must be inside Suspense) ────────
function SplashContent() {
  const searchParams = useSearchParams();
  const toParam = searchParams.get("to") ?? "feed";
  const destination = ALLOWED_DESTINATIONS[toParam] ?? "/feed";

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasNavigatedRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const goToDestination = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    try {
      const audio = audioRef.current;
      if (audio) { audio.pause(); audio.currentTime = 0; }
    } catch { /* ignore */ }
    window.location.replace(destination);
  }, [destination]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    // Back-gesture block
    history.pushState(null, "", window.location.href);
    const blockBack = () => {
      if (!hasNavigatedRef.current) history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", blockBack);

    // Safety timeout (15s — 5s past the 10s animation)
    safetyTimerRef.current = setTimeout(goToDestination, SAFETY_TIMEOUT_MS);

    // Start video + audio simultaneously
    if (video) video.play().catch(() => null);
    if (audio) audio.play().catch(() => null);

    return () => {
      window.removeEventListener("popstate", blockBack);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      try {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      } catch { /* ignore */ }
    };
  }, [goToDestination]);

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
      {/* VIDEO */}
      <AnimatePresence>
        {!videoFailed && (
          <motion.video
            key="splash-video"
            ref={videoRef}
            src="/api/public/media/anim"
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
            onEnded={goToDestination}
            onError={() => setVideoFailed(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              pointerEvents: "none",
            }}
            className="splash-video"
          />
        )}
      </AnimatePresence>

      {/* CSS FALLBACK (video failed) */}
      <AnimatePresence>
        {videoFailed && (
          <motion.div
            key="splash-fallback"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
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

      {/* AUDIO */}
      <audio ref={audioRef} src="/api/public/media/logo" preload="auto" style={{ display: "none" }} />

      {/* MUTE / UNMUTE BUTTON */}
      <motion.button
        onClick={toggleMute}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
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
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </motion.button>

      {/* SKIP BUTTON */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 10000,
          pointerEvents: "none",
        }}
      >
        <motion.button
          onClick={goToDestination}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            pointerEvents: "auto",
            padding: "8px 20px",
            borderRadius: 24,
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "#ffffff",
            fontFamily: "var(--font-barlow), sans-serif",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>Skip</span>
          <SkipForward size={16} />
        </motion.button>
      </div>

      {/* Responsive video styles */}
      <style>{`
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

// ── Page export — wraps SplashContent in Suspense (required for useSearchParams) ──
export default function SplashPage() {
  return (
    <Suspense
      fallback={
        <div style={{ position: "fixed", inset: 0, background: "#000" }} />
      }
    >
      <SplashContent />
    </Suspense>
  );
}
