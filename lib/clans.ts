import { Clan, ClanMember } from "@/models/Clan";
import { Territory } from "@/models/Territory";
import { computeAllWeeklyScores } from "./scoring";

export async function getClanList() {
  const clans = await Clan.find({}).lean();
  const allScores = await computeAllWeeklyScores();

  const rows = await Promise.all(
    clans.map(async (clan: any) => {
      const members = await ClanMember.find({ clanId: clan._id }).lean();
      const memberIds = members.map((m: any) => String(m.userId));
      const combined = allScores
        .filter((r) => memberIds.includes(String(r.user._id)))
        .reduce((s, r) => s + r.score.finalScore, 0);
      const zonesHeld = await Territory.countDocuments({ clanId: clan._id });
      return {
        id: String(clan._id),
        name: clan.name,
        tag: clan.tag,
        color: clan.color,
        memberCount: members.length,
        score: combined + zonesHeld * 200,
        zonesHeld,
      };
    }),
  );

  return rows.sort((a, b) => b.score - a.score).slice(0, 20);
}
