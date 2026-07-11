"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Swords } from "lucide-react";

export function JoinGroupRunButton({ groupRunId }: { groupRunId: string }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/group-runs/${groupRunId}/join`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't join.");
        return;
      }
      router.refresh();
    } finally {
      setJoining(false);
    }
  }

  return (
    <div>
      <button
        onClick={join}
        disabled={joining}
        className="w-full inline-flex items-center justify-center gap-2 bg-ignite text-midnight font-semibold py-3 rounded-full disabled:opacity-50"
      >
        {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
        Join the war
      </button>
      {error && <p className="text-xs text-ignite mt-2 text-center">{error}</p>}
    </div>
  );
}
