"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Route-level error boundary for everything under (app) — the authenticated shell had none
 * before this, so any unexpected render error (like a Server->Client function-prop crash)
 * white-screened instead of showing anything recoverable. This is the actual mechanism that
 * can catch errors thrown while rendering a child component; a plain try/catch in a parent
 * component cannot intercept those.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] unhandled render error:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <AlertTriangle className="w-10 h-10 text-ignite mx-auto mb-3" />
      <h1 className="font-display italic font-bold text-2xl mb-2">Something broke</h1>
      <p className="text-sm text-white/50 mb-6">
        This page hit an unexpected error. It&apos;s been logged — try again, or head back to your feed.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 text-sm font-semibold bg-momentum text-midnight px-4 py-2.5 rounded-full"
        >
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
        <Link href="/feed" className="text-sm font-semibold text-white/60 hover:text-white/90 px-4 py-2.5">
          Back to feed
        </Link>
      </div>
    </div>
  );
}
