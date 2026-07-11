import { connectDB } from "@/lib/mongodb";
import { CampusZone } from "@/models/CampusZone";
import { Territory } from "@/models/Territory";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { PostComposer } from "@/components/features/PostComposer";
import "@/models/User";

export default async function CreatePostPage() {
  await connectDB();
  const [zones, territories, me] = await Promise.all([
    CampusZone.find({}).sort({ name: 1 }).lean(),
    Territory.find({}).populate("ownerId").lean(),
    getOrCreateCurrentUser(),
  ]);

  const territoryByZone = new Map(territories.map((t: any) => [String(t.zoneId), t]));
  const zoneList = zones.map((z: any) => {
    const t = territoryByZone.get(String(z._id));
    const owner = t?.ownerId as any;
    return {
      id: String(z._id),
      name: z.name,
      ownerId: owner ? String(owner._id ?? owner) : null,
      ownerName: owner?.name ?? null,
      ownerAvatarUrl: owner?.avatarUrl ?? null,
    };
  });

  return <PostComposer zones={zoneList} currentUserId={me ? String(me._id) : null} />;
}
