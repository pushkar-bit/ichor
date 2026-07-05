import { notFound } from "next/navigation";
import { Swords, Crown, MapPin } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Clan, ClanMember } from "@/models/Clan";
import { Territory } from "@/models/Territory";
import { Attack } from "@/models/Attack";
import { computeUserWeeklyScore } from "@/lib/scoring";
import "@/models/User";
import "@/models/CampusZone";
import { Avatar } from "@/components/ui/Avatar";
import { ClanActions, KickButton } from "@/components/features/ClanActions";

export default async function ClanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const me = await getOrCreateCurrentUser();

  const clan = await Clan.findById(id).lean();
  if (!clan) notFound();

  const members = await ClanMember.find({ clanId: id }).populate("userId").sort({ role: 1, joinedAt: 1 }).lean();
  const memberRows = await Promise.all(
    members.map(async (m: any) => {
      const score = await computeUserWeeklyScore(String(m.userId._id));
      return {
        userId: String(m.userId._id),
        name: m.userId.name,
        avatarUrl: m.userId.avatarUrl,
        role: m.role,
        weeklyScore: score.finalScore,
      };
    }),
  );

  const territories = await Territory.find({ clanId: id }).populate("zoneId").lean();
  const memberIds = members.map((m: any) => String(m.userId._id));
  const attacks = await Attack.find({
    status: "PENDING",
    $or: [{ attackerId: { $in: memberIds } }, { defenderId: { $in: memberIds } }],
  })
    .populate("zoneId")
    .populate("attackerId")
    .populate("defenderId")
    .lean();

  const myMembership = me ? members.find((m: any) => String(m.userId._id) === String(me._id)) : null;
  const isMember = Boolean(myMembership);
  const isLeader = Boolean(myMembership && (myMembership as any).role === "LEADER");

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="rounded-2xl overflow-hidden border border-border-ichor mb-6">
        <div className="h-20" style={{ backgroundColor: (clan as any).color }} />
        <div className="bg-midnight-raised p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display italic font-bold text-2xl">{(clan as any).name}</h1>
                <span className="text-xs font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded">{(clan as any).tag}</span>
              </div>
              <p className="text-sm text-white/40 mt-1">
                {memberRows.length}/10 members · {territories.length} zones held
              </p>
            </div>
            {me && (
              <ClanActions
                clanId={String((clan as any)._id)}
                isMember={isMember}
                isLeader={isLeader}
                hasOwnClan={Boolean(me.clanId)}
              />
            )}
          </div>
        </div>
      </div>

      {(clan as any).dietPactDescription && (
        <div className="bg-lime/10 border border-lime/30 text-lime rounded-xl p-4 mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1">Clan Diet Pact</div>
          <p className="text-sm">{(clan as any).dietPactDescription}</p>
        </div>
      )}

      <h2 className="font-semibold text-sm text-white/60 mb-3">Members</h2>
      <div className="space-y-2 mb-6">
        {memberRows.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-2.5">
            <Avatar src={m.avatarUrl} name={m.name} size={32} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{m.name}</span>
                {m.role === "LEADER" && <Crown className="w-3.5 h-3.5 text-lime" />}
              </div>
              <span className="text-xs text-white/40">{m.weeklyScore} pts this week</span>
            </div>
            {isLeader && m.userId !== String(me?._id) && <KickButton clanId={String((clan as any)._id)} userId={m.userId} />}
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-sm text-white/60 mb-3">Territory</h2>
      {territories.length === 0 ? (
        <p className="text-sm text-white/30 mb-6">No zones held yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-6">
          {territories.map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-2 bg-midnight-raised border border-border-ichor rounded-xl px-3 py-2.5">
              <MapPin className="w-3.5 h-3.5 text-momentum shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.zoneId?.name}</div>
                <div className="text-xs text-white/40">{t.weeklyCalorieScore} score</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-sm text-white/60 mb-3">Clan Wars</h2>
      {attacks.length === 0 ? (
        <p className="text-sm text-white/30">No active battles.</p>
      ) : (
        <div className="space-y-2">
          {attacks.map((a: any) => (
            <div key={a._id} className="flex items-center gap-2.5 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3">
              <Swords className="w-4 h-4 text-ignite shrink-0" />
              <span className="text-sm">
                <span className="font-semibold">{a.attackerId?.name}</span> vs{" "}
                <span className="font-semibold">{a.defenderId?.name}</span> for {a.zoneId?.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
