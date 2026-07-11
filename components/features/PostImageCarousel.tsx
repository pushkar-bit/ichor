"use client";

import { useCallback, useRef, useState } from "react";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";

// Reasonable fallback while an image is still loading its natural dimensions.
const DEFAULT_ASPECT_RATIO = 4 / 3;

export function PostImageCarousel({
  photoUrls,
  zoneName,
  onOpen,
  heightClass = "max-h-[70vh]",
}: {
  photoUrls: string[];
  zoneName?: string | null;
  onOpen?: () => void;
  heightClass?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleLoad = useCallback(
    (index: number) => (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (!img.naturalWidth || !img.naturalHeight) return;
      setRatios((prev) =>
        prev[index] ? prev : { ...prev, [index]: img.naturalWidth / img.naturalHeight },
      );
    },
    [],
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(photoUrls.length - 1, index));
      setActiveIndex(clamped);
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    },
    [photoUrls.length],
  );

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < photoUrls.length - 1;

  // The window is sized to the currently active image's own aspect ratio, so it
  // grows/shrinks per-slide instead of forcing every photo into one fixed box.
  const activeRatio = ratios[activeIndex] ?? DEFAULT_ASPECT_RATIO;

  return (
    <div
      className={`relative w-full bg-black overflow-hidden ${heightClass} ${onOpen ? "cursor-pointer" : ""}`}
      style={{ aspectRatio: String(activeRatio) }}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={onOpen}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {photoUrls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt=""
            onLoad={handleLoad(i)}
            className="w-full h-full shrink-0 snap-center object-contain bg-midnight-card"
          />
        ))}
      </div>

      {photoUrls.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            disabled={!hasPrev}
            onClick={(e) => {
              e.stopPropagation();
              goTo(activeIndex - 1);
            }}
            className={`absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/20 transition-colors ${
              hasPrev ? "text-white hover:bg-black/70 cursor-pointer" : "text-white/25 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            disabled={!hasNext}
            onClick={(e) => {
              e.stopPropagation();
              goTo(activeIndex + 1);
            }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/20 transition-colors ${
              hasNext ? "text-white hover:bg-black/70 cursor-pointer" : "text-white/25 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {photoUrls.length > 1 && (
        <div className="absolute bottom-3 right-3 flex gap-1.5 pointer-events-none">
          {photoUrls.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === activeIndex ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}

      {zoneName && (
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 text-xs font-medium bg-black/60 backdrop-blur px-3 py-1.5 rounded-none border border-white/20 pointer-events-none">
          <MapPin className="w-3.5 h-3.5" /> {zoneName}
        </span>
      )}
    </div>
  );
}
