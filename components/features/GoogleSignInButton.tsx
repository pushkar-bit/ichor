"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.42-.22-2.05H12v3.72h6.6c-.13 1.1-.85 2.75-2.45 3.86l-.02.15 3.56 2.76.25.02c2.27-2.1 3.58-5.18 3.58-8.46"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.79-2.94c-1.02.7-2.38 1.19-4.16 1.19-3.18 0-5.88-2.1-6.84-5H1.24v2.93A12 12 0 0 0 12 24"
      />
      <path fill="#FBBC05" d="M5.16 14.35a7.2 7.2 0 0 1-.38-2.35c0-.82.14-1.61.37-2.35V6.72H1.24a12 12 0 0 0 0 10.56z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 2.97.76 3.65 1.4l2.67-2.6C16.95 1.98 14.24.8 12 .8A12 12 0 0 0 1.24 6.72l3.92 3.04c.96-2.9 3.66-5 6.84-5"
      />
    </svg>
  );
}

/** Only mount this when NEXT_PUBLIC_GOOGLE_CLIENT_ID is actually set — useGoogleLogin's
 *  effect throws synchronously (crashing the page) if the client ID is missing/empty. */
export function GoogleSignInButton({ label = "Continue with Google" }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueWithGoogle = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        });
        if (res.ok) {
          // Trigger the ICHOR logo animation before landing on the feed
          router.push("/splash");
          router.refresh();
        } else {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "Couldn't continue with Google. Please try again.");
          setLoading(false);
        }
      } catch {
        setError("Network error. Please try again.");
        setLoading(false);
      }
    },
    onError: () => {
      setError("Couldn't continue with Google. Please try again.");
      setLoading(false);
    },
  });

  return (
    <>
      <button
        onClick={() => continueWithGoogle()}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border border-border-ichor hover:bg-white/5 transition-colors rounded-xl py-3 text-white font-medium disabled:opacity-50"
      >
        <GoogleIcon />
        {loading ? "Signing in..." : label}
      </button>
      {error && <p className="text-xs text-ignite text-center mt-4">{error}</p>}
    </>
  );
}

export function GoogleNotConfiguredNotice() {
  return (
    <div className="text-xs text-white/40 text-center border border-dashed border-border-ichor rounded-xl py-3 px-4">
      Google sign-in isn&apos;t configured yet. Add <code className="text-white/60">GOOGLE_CLIENT_ID</code> and{" "}
      <code className="text-white/60">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to <code className="text-white/60">.env</code>.
    </div>
  );
}
