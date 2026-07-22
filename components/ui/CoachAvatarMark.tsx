// Vikas Yadav's avatar, everywhere it appears (floating bubble, chat headers, per-message
// icons) — an original, stylized bust silhouette (beard, draped cloth over one shoulder, an
// ancient-athlete silhouette) rendered as flat monochrome vector shapes on a dark badge.
// Deliberately not a photograph and not any real person's likeness.
export function CoachAvatarMark({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center bg-midnight-raised ${className ?? ""}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/40" />
      <svg viewBox="0 0 48 48" fill="none" aria-hidden className="relative z-10 w-[78%] h-[78%]">
        {/* torso */}
        <path
          d="M8 44c0-8.5 4.6-14.2 9.6-16.4l.9 3.6c-4.8 2-8 6.7-8 12.8h27.4c0-6.3-3.4-11-8.3-13l1-3.6c5.1 2.2 9.9 8 9.9 16.6H8z"
          fill="#EDEAEE"
          fillOpacity="0.16"
        />
        {/* draped cloth across the left shoulder */}
        <path d="M17 24.5c2.1 1.5 4.4 2.3 7 2.3s4.9-.8 7-2.3l1.2 4.4c-2.4 1.9-5.1 2.9-8.2 2.9s-5.8-1-8.2-2.9l1.2-4.4z" fill="#AE93F4" fillOpacity="0.55" />
        {/* head */}
        <ellipse cx="24" cy="15.5" rx="7.4" ry="8.2" fill="#EDEAEE" fillOpacity="0.22" />
        {/* beard */}
        <path
          d="M17 15c0 6.4 2.9 11 7 11s7-4.6 7-11c-1.6 2-3.6 2.8-7 2.8s-5.4-.8-7-2.8z"
          fill="#EDEAEE"
          fillOpacity="0.32"
        />
        {/* hair cap */}
        <path d="M16.7 13.5c.4-4.7 3.4-7.8 7.3-7.8s6.9 3.1 7.3 7.8c-2.1-1.6-4.6-2.3-7.3-2.3s-5.2.7-7.3 2.3z" fill="#EDEAEE" fillOpacity="0.32" />
      </svg>
    </div>
  );
}
