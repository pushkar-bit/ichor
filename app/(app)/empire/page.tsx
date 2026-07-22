import { Castle } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { getClanEmpire } from "@/lib/clans";
import { getClanWars } from "@/lib/clanWars";
import { ClanMember } from "@/models/Clan";
import { CreateClanForm } from "@/components/features/CreateClanForm";
import { EmpireView } from "@/components/features/EmpireView";

export default async function EmpirePage() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return null;

  if (!me.clanId) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-center">
        <Castle className="w-10 h-10 text-momentum mx-auto mb-3" />
        <h1 className="font-display italic font-bold text-3xl mb-2">You have no clan.</h1>
        <p className="text-sm text-white/50 mb-6">
          Build your empire. Bring your crew together — every territory your members hold becomes one collective
          empire, mapped as a single landmass, earning points together for every kilometer run on it.
        </p>
        <CreateClanForm redirectTo={() => "/empire"} />
      </div>
    );
  }

  const empire = await getClanEmpire(String(me.clanId), String(me._id));
  if (!empire) return null;

  const [myMembership, wars] = await Promise.all([
    ClanMember.findOne({ clanId: me.clanId, userId: me._id }).lean(),
    getClanWars(me.clanId),
  ]);
  const isLeader = Boolean(myMembership && (myMembership as { role?: string }).role === "LEADER");

  return (
    <EmpireView
      clan={{ id: empire.id, name: empire.name, tag: empire.tag, color: empire.color, dietPactDescription: empire.dietPactDescription, battlesWon: empire.battlesWon }}
      members={empire.members}
      territories={empire.territories}
      zonesHeld={empire.zonesHeld}
      collectiveKm={empire.collectiveKm}
      collectivePoints={empire.collectivePoints}
      wars={wars}
      myUserId={String(me._id)}
      isLeader={isLeader}
    />
  );
}
