import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { getClanList } from "@/lib/clans";
import { ClansListClient } from "@/components/features/ClansListClient";

export default async function ClansPage() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const clans = await getClanList();
  return <ClansListClient myClanId={me?.clanId ? String(me.clanId) : null} initialClans={clans} />;
}
