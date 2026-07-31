import Image from "next/image";

/**
 * The ICHOR brand mark — a photorealistic rendered glyph (public/images/newl.jpg), not a
 * flat vector: `className` must set an explicit width/height (or an aspect-ratio) for the
 * `fill` image to size against. Its near-black background blends into the app's own
 * midnight background, so it reads cleanly without needing a cutout/transparent asset.
 */
export function IchorMark({ className }: { className?: string }) {
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <Image src="/images/newl.jpg" alt="ICHOR" fill className="object-contain" sizes="200px" />
    </span>
  );
}

export function IchorLogo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <IchorMark className="w-8 h-8 shrink-0" />
      <span className={`font-display italic font-bold tracking-tight ${textClassName ?? "text-xl"}`}>ICHOR</span>
    </span>
  );
}
