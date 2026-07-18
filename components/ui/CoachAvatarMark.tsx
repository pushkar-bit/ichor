import { IchorMark } from "./IchorMark";

// The coach's avatar, everywhere it appears (floating bubble, chat headers, per-message
// icons) — the brand mark on a dark badge with a small spark accent, rather than a
// separate illustrated mascot with its own unrelated color language.
export function CoachAvatarMark({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center bg-midnight-raised ${className ?? ""}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-momentum/25 via-transparent to-transparent" />
      <IchorMark className="relative z-10 w-[42%] h-[42%] text-momentum" />
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="absolute bottom-[10%] right-[10%] z-10 w-[28%] h-[28%] text-lime drop-shadow-[0_0_3px_rgba(215,242,76,0.6)]">
        <path d="M12 2.5c.6 2.9 1.4 4.9 2.6 6.1 1.2 1.2 3.2 2 6.1 2.6-2.9.6-4.9 1.4-6.1 2.6-1.2 1.2-2 3.2-2.6 6.1-.6-2.9-1.4-4.9-2.6-6.1-1.2-1.2-3.2-2-6.1-2.6 2.9-.6 4.9-1.4 6.1-2.6 1.2-1.2 2-3.2 2.6-6.1z" />
      </svg>
    </div>
  );
}
