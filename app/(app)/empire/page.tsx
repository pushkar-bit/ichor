import { Castle, AlertTriangle } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { getClanEmpire } from "@/lib/clans";
import { getClanWars } from "@/lib/clanWars";
import { ClanMember, Clan } from "@/models/Clan";
import { CreateClanForm } from "@/components/features/CreateClanForm";
import { EmpireView } from "@/components/features/EmpireView";

function NoClanState() {
  return (
    <div className="max-w-md mx-auto px-4 py-10 text-center">
      <Castle className="w-10 h-10 text-momentum mx-auto mb-3" />
      <h1 className="font-display italic font-bold text-3xl mb-2">You have no clan.</h1>
      <p className="text-sm text-white/50 mb-6">
        Build your empire. Bring your crew together — every territory your members hold becomes one collective
        empire, mapped as a single landmass, earning points together for every kilometer run on it.
      </p>
      <CreateClanForm redirectTo="/empire" />
    </div>
  );
}

export default async function EmpirePage() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return null;

  if (!me.clanId) return <NoClanState />;

  // me.clanId can point at a clan that no longer exists (e.g. the last member left and it
  // was deleted from under a stale reference) — repair it instead of rendering a blank page.
  const clanStillExists = await Clan.exists({ _id: me.clanId });
  if (!clanStillExists) {
    me.clanId = null;
    await me.save();
    return <NoClanState />;
  }

  let empire;
  try {
    empire = await getClanEmpire(String(me.clanId), String(me._id));
  } catch (err) {
    console.error("[empire] getClanEmpire failed:", err);
    empire = null;
  }
  if (!empire) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-center">
        <AlertTriangle className="w-10 h-10 text-ignite mx-auto mb-3" />
        <h1 className="font-display italic font-bold text-2xl mb-2">Couldn&apos;t load your empire</h1>
        <p className="text-sm text-white/50">Something went wrong loading your clan&apos;s data. Try refreshing.</p>
      </div>
    );
  }

  const myMembership = await ClanMember.findOne({ clanId: me.clanId, userId: me._id }).lean();
  const isLeader = Boolean(myMembership && (myMembership as { role?: string }).role === "LEADER");

  // Clan wars is secondary to the empire view itself — a failure here shouldn't blank the
  // whole page.
  let wars: Awaited<ReturnType<typeof getClanWars>> = [];
  try {
    wars = await getClanWars(me.clanId);
  } catch (err) {
    console.error("[empire] getClanWars failed:", err);
  }

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
