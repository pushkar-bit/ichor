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
    <div className="flex flex-col items-center gap-3 w-full">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => handleReact(e, "HYPE", hype, setHype, "#fda2de")}
        className={`inline-flex w-full justify-center items-center gap-2 text-sm font-bold px-4 py-2 rounded-none border-2 transition-colors ${
          hype.given
            ? "border-afterrun bg-afterrun/20 text-afterrun"
            : "border-border-ichor text-white/60 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Flame className={`w-4 h-4 ${hype.given ? "fill-current" : ""}`} />
        {hype.count}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => handleReact(e, "RESPECT", respect, setRespect, "#d7f24c")}
        className={`inline-flex w-full justify-center items-center gap-2 text-sm font-bold px-4 py-2 rounded-none border-2 transition-colors ${
          respect.given
            ? "border-lime bg-lime/20 text-lime"
            : "border-border-ichor text-white/60 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Handshake className={`w-4 h-4 ${respect.given ? "fill-current" : ""}`} />
        {respect.count}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => handleReact(e, "CHALLENGE", challenge, setChallenge, "#ff5e1a")}
        className={`inline-flex w-full justify-center items-center gap-2 text-sm font-bold px-4 py-2 rounded-none border-2 transition-colors ${
          challenge.given
            ? "border-ignite bg-ignite/20 text-ignite"
            : "border-border-ichor text-white/60 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Swords className={`w-4 h-4 ${challenge.given ? "fill-current" : ""}`} />
        {challenge.count}
      </motion.button>
    </div>
  );
}
