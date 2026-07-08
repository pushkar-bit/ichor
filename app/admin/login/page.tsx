"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { IchorLogo } from "@/components/ui/IchorMark";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Invalid email or password.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <IchorLogo className="justify-center mb-4" textClassName="text-2xl" />
          <p className="text-sm text-white/50 flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Admin access
          </p>
        </div>
        <form onSubmit={submit} className="bg-midnight-raised border border-border-ichor shadow-xl rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum/50"
            />
          </div>
          {error && <p className="text-xs text-ignite">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-momentum text-midnight font-semibold py-3 rounded-full disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
