"use client";

import { IchorLogo } from "@/components/ui/IchorMark";
import { useLenis } from "@/lib/landing/lenis-context";

export default function LandingNav() {
  const { scrollTo } = useLenis();

  const goToJoin = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollTo("#join");
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="flex items-center justify-between px-5 py-4 md:px-10 md:py-6">
        <a href="#join" onClick={goToJoin} data-cursor-hover>
          <IchorLogo textClassName="text-xl" />
        </a>

        <a
          href="#join"
          onClick={goToJoin}
          data-magnetic
          data-cursor-hover
          className="inline-block rounded-full border border-border-ichor bg-midnight-raised/50 px-5 py-2 text-sm font-medium uppercase tracking-widest text-foreground backdrop-blur transition-colors duration-200 hover:border-momentum/60"
        >
          Sign in
        </a>
      </div>
    </header>
  );
}
