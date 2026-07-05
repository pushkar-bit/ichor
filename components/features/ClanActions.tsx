"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function ClanActions({
  clanId,
  isMember,
  isLeader,
  hasOwnClan,
}: {
  clanId: string;
  isMember: boolean;
  isLeader: boolean;
  hasOwnClan: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmJoin, setConfirmJoin] = useState(false);

  async function join() {
    setBusy(true);
    try {
      const res = await fetch(`/api/clans/${clanId}/join`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      const res = await fetch(`/api/clans/${clanId}/leave`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (isMember) {
    return (
      <button
        onClick={leave}
        disabled={busy}
        className="text-sm font-semibold bg-white/10 hover:bg-white/15 px-4 py-2 rounded-full disabled:opacity-50 inline-flex items-center gap-2"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {isLeader ? "Leave (transfers leadership)" : "Leave Clan"}
      </button>
    );
  }

  if (confirmJoin) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">{hasOwnClan ? "This leaves your current clan." : "Confirm?"}</span>
        <button
          onClick={join}
          disabled={busy}
          className="text-sm font-semibold bg-momentum text-midnight px-4 py-2 rounded-full disabled:opacity-50"
        >
          Yes, join
        </button>
        <button onClick={() => setConfirmJoin(false)} className="text-sm text-white/40 px-2">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirmJoin(true)}
      className="text-sm font-semibold bg-momentum text-midnight px-4 py-2 rounded-full"
    >
      Join Clan
    </button>
  );
}

export function KickButton({ clanId, userId }: { clanId: string; userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function kick() {
    setBusy(true);
    try {
      const res = await fetch(`/api/clans/${clanId}/members/${userId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={kick} disabled={busy} className="text-xs text-white/30 hover:text-ignite disabled:opacity-50">
      Kick
    </button>
  );
}
