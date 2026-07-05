import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { TerritoryMap } from "@/components/features/TerritoryMap";

export default async function MapPage() {
  const me = await getOrCreateCurrentUser();
  return <TerritoryMap currentUserId={String(me?._id)} />;
}
