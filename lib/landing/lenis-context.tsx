"use client";

import { createContext, useContext, useRef } from "react";
import type Lenis from "lenis";

type LenisContextValue = {
  register: (instance: Lenis | null) => void;
  scrollTo: (target: string | number | HTMLElement, opts?: object) => void;
};

const LenisContext = createContext<LenisContextValue | null>(null);

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<Lenis | null>(null);

  const value: LenisContextValue = {
    register: (instance) => {
      ref.current = instance;
    },
    scrollTo: (target, opts) => {
      if (ref.current) {
        ref.current.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 3), ...opts });
      } else if (typeof target === "string") {
        document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
      }
    },
  };

  return (
    <LenisContext.Provider value={value}>{children}</LenisContext.Provider>
  );
}

export function useLenis() {
  const ctx = useContext(LenisContext);
  if (!ctx) throw new Error("useLenis must be used within LenisProvider");
  return ctx;
}
