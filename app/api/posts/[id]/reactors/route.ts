import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import { User } from "@/models/User";
import { getInterestSets, combineReactorIds, pickFeaturedReactorId } from "@/lib/reactionSummary";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const { id } = await params;

  const post = await Post.findById(id).select("hypeUserIds respectUserIds challengeUserIds").lean();
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const reactorIds = combineReactorIds(post as any);
  if (reactorIds.length === 0) return NextResponse.json({ totalCount: 0, reactors: [] });

  const [users, sets] = await Promise.all([
    User.find({ _id: { $in: reactorIds } }).select("name username avatarUrl").lean(),
    me ? getInterestSets(String(me._id), me.clanId) : Promise.resolve(null),
  ]);
  const userById = new Map((users as any[]).map((u) => [String(u._id), u]));

  const typesByUser = new Map<string, string[]>();
  const addType = (ids: unknown[] | undefined, type: string) => {
    for (const id of ids ?? []) {
      const key = String(id);
      const list = typesByUser.get(key) ?? [];
      list.push(type);
      typesByUser.set(key, list);
    }
  };
  addType((post as any).hypeUserIds, "HYPE");
  addType((post as any).respectUserIds, "RESPECT");
  addType((post as any).challengeUserIds, "CHALLENGE");

  const featuredId = sets ? pickFeaturedReactorId(reactorIds, sets, String(me!._id)) : reactorIds[0];
  const ordered = featuredId ? [featuredId, ...reactorIds.filter((id) => id !== featuredId)] : reactorIds;

  const reactors = ordered
    .map((id) => {
      const u = userById.get(id);
      if (!u) return null;
      return {
        id,
        name: me && String(me._id) === id ? "You" : (u.name ?? "Athlete"),
        username: u.username ?? null,
        avatarUrl: u.avatarUrl ?? "",
        types: typesByUser.get(id) ?? [],
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return NextResponse.json({ totalCount: reactors.length, reactors });
}
