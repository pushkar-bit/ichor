"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

/**
 * ICHOR Splash Animation Screen
 *
 * Route: /splash  (top-level, outside the (app) group — NavShell is never mounted)
 *
 * Plays public/anim.mp4 (muted <video> for cross-browser autoplay policy compat)
 * simultaneously with public/logo.mp3 (unmuted <audio>) via Promise.all on mount.
 *
 * On video "ended":
 *   1. Pause & reset audio  → prevents memory leaks
 *   2. router.replace("/feed")  → no splash entry left in history stack
 *
 * Back-gesture guard: we push a duplicate history entry so the popstate
 * event is intercepted and cancelled — the user cannot navigate away mid-play.
 */
export default function SplashPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasNavigatedRef = useRef(false);

  /** Clean up audio without throwing if already stopped */
  const cleanupAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
  }, []);

  /** Called the instant the video finishes playing */
  const handleVideoEnded = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    cleanupAudio();
    // Replace so pressing back skips /splash entirely
    router.replace("/feed");
  }, [cleanupAudio, router]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    // ── Back-gesture block ───────────────────────────────────────────────
    // Push a duplicate entry so the first back press just pops back here.
    history.pushState(null, "", "/splash");
    const blockBack = () => {
      if (!hasNavigatedRef.current) {
        history.pushState(null, "", "/splash");
      }
    };
    window.addEventListener("popstate", blockBack);

    // ── Simultaneous playback ────────────────────────────────────────────
    Promise.all([video.play(), audio.play()]).catch(() => {
      // If audio autoplay is blocked (browser policy), still play the video.
      // Audio is best-effort; video is the primary UX signal.
      video.play().catch(() => {
        // If even video fails, skip straight to feed.
        handleVideoEnded();
      });
    });

    return () => {
      window.removeEventListener("popstate", blockBack);
      cleanupAudio();
    };
  }, [cleanupAudio, handleVideoEnded]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeIn" }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000000",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* ── VIDEO LAYER ─────────────────────────────────────────────────── */}
      {/* muted is required for autoplay in all major browsers.              */}
      {/* The audio track is handled separately below at full volume.        */}
      <video
        ref={videoRef}
        src="/anim.mp4"
        muted
        playsInline
        preload="auto"
        onEnded={handleVideoEnded}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // Hide every native browser media control
          pointerEvents: "none",
        }}
        // Completely suppress the native controls UI
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
      />

      {/* ── AUDIO LAYER ─────────────────────────────────────────────────── */}
      {/* Separate <audio> element — plays logo.mp3 at full volume while     */}
      {/* the video plays its visual track (video itself is muted above).    */}
      <audio
        ref={audioRef}
        src="/logo.mp3"
        preload="auto"
        // Hidden; no UI needed
        style={{ display: "none" }}
      />
    </motion.div>
  );
}
