import { notFound } from "next/navigation";
import { Swords, Trophy, Check, Clock } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { GroupRun } from "@/models/GroupRun";
import "@/models/User";
import { Avatar } from "@/components/ui/Avatar";
import { JoinGroupRunButton } from "@/components/features/GroupRunActions";

export default async function GroupRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) notFound();

  const groupRun = await GroupRun.findById(id)
    .populate("participants.userId")
    .populate("results.leaderboard.userId")
    .lean();
  if (!groupRun) notFound();

  const g = groupRun as any;
  const isParticipant = g.participants.some((p: any) => String(p.userId?._id ?? p.userId) === String(me._id));
  const canJoin = !isParticipant && g.status !== "COMPLETED";

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Swords className="w-5 h-5 text-ignite" />
        <h1 className="font-display italic font-bold text-2xl">{g.title}</h1>
      </div>
      <p className="text-sm text-white/50 mb-5">
        Group run · code <span className="font-mono text-white/70">{g.sessionCode}</span>
      </p>

      <div className="flex items-center gap-2 mb-6 text-xs">
        <StatusBadge status={g.status} />
        <span className="inline-flex items-center gap-1 text-white/40">
          <Clock className="w-3.5 h-3.5" />
          {g.status === "COMPLETED"
            ? `Ended ${new Date(g.endedAt).toLocaleTimeString()}`
            : `Runs from ${new Date(g.startAt).toLocaleTimeString()} to ${new Date(g.windowEnd).toLocaleTimeString()}`}
        </span>
      </div>

      {canJoin && (
        <div className="mb-6">
          <JoinGroupRunButton groupRunId={String(g._id)} />
        </div>
      )}

      {g.status !== "COMPLETED" && (
        <p className="text-sm text-white/50 bg-white/5 rounded-xl p-3.5 mb-6">
          Log a workout with a photo any time before the window closes — it&apos;ll auto-attach to this war.
        </p>
      )}

      <h2 className="font-semibold text-sm text-white/60 mb-3">Participants</h2>
      <div className="space-y-2 mb-6">
        {g.participants.map((p: any) => {
          const user = p.userId;
          const userId = String(user?._id ?? user);
          return (
            <div key={userId} className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-2.5">
              <Avatar src={user?.avatarUrl} name={user?.name ?? "Athlete"} size={32} />
              <span className="text-sm font-medium flex-1 truncate">{user?.name ?? "Athlete"}</span>
              {p.runId && (
                <span className="inline-flex items-center gap-1 text-xs text-lime">
                  <Check className="w-3.5 h-3.5" /> Ran
                </span>
              )}
            </div>
          );
        })}
      </div>

      {g.results?.leaderboard?.length > 0 && (
        <>
          <h2 className="font-semibold text-sm text-white/60 mb-3">Results</h2>
          <div className="space-y-2 mb-6">
            {g.results.leaderboard.map((l: any) => {
              const user = l.userId;
              const userId = String(user?._id ?? user);
              const isWinner = l.rank === 1;
              return (
                <div
                  key={userId}
                  className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-2.5"
                >
                  <span className="text-sm font-bold text-white/40 w-4">{l.rank}</span>
                  <Avatar src={user?.avatarUrl} name={user?.name ?? "Athlete"} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {user?.name ?? "Athlete"}
                      {isWinner && <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />}
                    </div>
                    <div className="text-xs text-white/40">
                      {l.distanceKm}km · {l.caloriesBurned} cal
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status === "LOBBY" ? "Lobby" : status === "WINDOW_OPEN" ? "Window open" : "Completed";
  return (
    <span className="text-xs font-semibold bg-white/10 px-2.5 py-1 rounded-full">{label}</span>
  );
}
