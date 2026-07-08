"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { Flame, Handshake, Swords } from "lucide-react";

type ReactionBarProps = {
  postId: string;
  initialHype: { count: number; given: boolean };
  initialRespect: { count: number; given: boolean };
  initialChallenge: { count: number; given: boolean };
};

export function ReactionBar({ postId, initialHype, initialRespect, initialChallenge }: ReactionBarProps) {
  const router = useRouter();
  const [hype, setHype] = useState(initialHype);
  const [respect, setRespect] = useState(initialRespect);
  const [challenge, setChallenge] = useState(initialChallenge);
  const [isLiking, setIsLiking] = useState(false);

  const triggerConfetti = (x: number, y: number, color: string) => {
    confetti({
      particleCount: 20,
      spread: 60,
      origin: { x, y },
      colors: [color, "#ffffff"],
      disableForReducedMotion: true,
      zIndex: 100,
    });
  };

  const handleReact = async (
    e: React.MouseEvent<HTMLButtonElement>,
    type: "HYPE" | "RESPECT" | "CHALLENGE",
    state: { count: number; given: boolean },
    setter: React.Dispatch<React.SetStateAction<{ count: number; given: boolean }>>,
    color: string
  ) => {
    if (isLiking) return;
    setIsLiking(true);

    const isGiven = state.given;
    setter({ count: isGiven ? Math.max(0, state.count - 1) : state.count + 1, given: !isGiven });

    if (!isGiven) {
      if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(50);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      triggerConfetti(x, y, color);
    }

    try {
      const res = await fetch(`/api/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setter({ count: data.count, given: data.hasReacted });
      router.refresh();
    } catch (err) {
      setter(state); // revert
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => handleReact(e, "HYPE", hype, setHype, "#fda2de")}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${
          hype.given
            ? "border-afterrun bg-afterrun/20 text-afterrun"
            : "border-border-ichor text-white/50 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Flame className={`w-3.5 h-3.5 ${hype.given ? "fill-current" : ""}`} />
        {hype.count}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => handleReact(e, "RESPECT", respect, setRespect, "#d7f24c")}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${
          respect.given
            ? "border-lime bg-lime/20 text-lime"
            : "border-border-ichor text-white/50 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Handshake className={`w-3.5 h-3.5 ${respect.given ? "fill-current" : ""}`} />
        {respect.count}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => handleReact(e, "CHALLENGE", challenge, setChallenge, "#ff5e1a")}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${
          challenge.given
            ? "border-ignite bg-ignite/20 text-ignite"
            : "border-border-ichor text-white/50 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Swords className={`w-3.5 h-3.5 ${challenge.given ? "fill-current" : ""}`} />
        {challenge.count}
      </motion.button>
    </div>
  );
}
