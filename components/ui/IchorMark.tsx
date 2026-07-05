export function IchorMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={className} fill="currentColor" aria-hidden>
      <path d="M75 8C55 8 35 25 35 52c0 22 15 38 30 44-18-2-45-16-45-48C20 20 42 0 68 0c4 0 8 3 7 8z" />
    </svg>
  );
}

export function IchorLogo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <IchorMark className="w-6 h-7 text-momentum shrink-0" />
      <span className={`font-display italic font-bold tracking-tight ${textClassName ?? "text-xl"}`}>ICHOR</span>
    </span>
  );
}
