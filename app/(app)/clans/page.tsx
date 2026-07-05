import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { ClansListClient } from "@/components/features/ClansListClient";

export default async function ClansPage() {
  const me = await getOrCreateCurrentUser();
  return <ClansListClient myClanId={me?.clanId ? String(me.clanId) : null} />;
}
