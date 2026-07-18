import SmoothScroll from "./SmoothScroll";
import CustomCursor from "./CustomCursor";
import ParticleField from "./ParticleField";
import LandingNav from "./LandingNav";
import ScrollCue from "./ScrollCue";
import LandingSignUp from "./LandingSignUp";

/**
 * The scroll-driven particle landing/sign-up experience — see components/features/landing/
 * for each piece. Scoped entirely to app/page.tsx: SmoothScroll (Lenis) and CustomCursor only
 * apply within this tree, so the rest of the app (feed, map, etc.) keeps native scroll and
 * cursor behavior.
 */
export default function LandingExperience() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <ParticleField />
      <LandingNav />
      <ScrollCue />
      <main id="top" className="relative z-10">
        {/* Pure scroll distance for the logo -> kangaroo -> jump -> jump -> human -> run
            sequence, rendered by the fixed ParticleField canvas behind this transparent track. */}
        <div id="scroll-track" className="h-[300vh] w-full" />
        <LandingSignUp />
      </main>
    </SmoothScroll>
  );
}
