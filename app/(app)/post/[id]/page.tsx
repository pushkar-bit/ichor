import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import { DietCard } from "@/models/DietCard";
import { Comment } from "@/models/Comment";
import { CampusZone } from "@/models/CampusZone";
import { User } from "@/models/User";
import "@/models/Workout";
import { serializePost } from "@/lib/serialize";
import { getInterestSets, combineReactorIds, pickFeaturedReactorId } from "@/lib/reactionSummary";
import { Avatar } from "@/components/ui/Avatar";
import { StatChip } from "@/components/ui/StatChip";
import { ReactionBar } from "@/components/features/ReactionBar";
import { ReactionSummary } from "@/components/features/ReactionSummary";
import { CommentSection } from "@/components/features/CommentSection";
import { FlagButton } from "@/components/features/FlagButton";
import { DietPill } from "@/components/features/ActivityCard";
import { EditCaption } from "@/components/features/EditCaption";
import { DeletePostButton } from "@/components/features/DeletePostButton";
import { timeAgo, formatPace, formatDuration } from "@/lib/utils";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const me = await getOrCreateCurrentUser();

  const postDoc = await Post.findById(id).populate("userId").populate("workoutId").lean();
  if (!postDoc) notFound();

  const [dietCard, comments, zone, interestSets] = await Promise.all([
    DietCard.findOne({ postId: id }).lean(),
    Comment.find({ postId: id }).sort({ createdAt: 1 }).populate("authorId").lean(),
    (postDoc as any).locationZoneId ? CampusZone.findById((postDoc as any).locationZoneId).lean() : null,
    me ? getInterestSets(String(me._id), me.clanId) : null,
  ]);

  const reactorIds = combineReactorIds(postDoc as any);
  let reactionSummary = null;
  if (reactorIds.length > 0) {
    const featuredId = interestSets ? pickFeaturedReactorId(reactorIds, interestSets, String(me!._id)) : reactorIds[0];
    const featuredUser = featuredId ? await User.findById(featuredId).select("name avatarUrl").lean() : null;
    reactionSummary = {
      featuredName: me && featuredId === String(me._id) ? "You" : ((featuredUser as any)?.name ?? "Athlete"),
      featuredAvatarUrl: (featuredUser as any)?.avatarUrl ?? "",
      totalCount: reactorIds.length,
    };
  }

  const post = serializePost(
    { ...postDoc, dietCard, commentCount: comments.length, zoneName: (zone as any)?.name ?? null, reactionSummary },
    me ? String(me._id) : undefined,
  );

  const serializedComments = comments.map((c: any) => ({
    id: String(c._id),
    parentId: c.parentId ? String(c.parentId) : null,
    text: c.text,
    createdAt: c.createdAt.toISOString(),
    author: { name: c.authorId?.name ?? "Athlete", avatarUrl: c.authorId?.avatarUrl ?? "" },
  }));

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-5">
        <ArrowLeft className="w-4 h-4" /> Back to feed
      </Link>

      <article className="bg-midnight-raised border border-border-ichor rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          {post.author.username ? (
            <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar src={post.author.avatarUrl} name={post.author.name} size={40} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm hover:underline">{post.author.name}</span>
                <div className="text-xs text-white/40">{timeAgo(post.createdAt)}</div>
              </div>
            </Link>
          ) : (
            <>
              <Avatar src={post.author.avatarUrl} name={post.author.name} size={40} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm">{post.author.name}</span>
                <div className="text-xs text-white/40">{timeAgo(post.createdAt)}</div>
              </div>
            </>
          )}
          <span className="text-[11px] font-medium text-momentum bg-momentum/10 px-2 py-1 rounded-full">
            {post.workout.activityType}
          </span>
        </div>

        {post.photoUrls.length > 0 && (
          <div className="bg-black">
            {post.photoUrls.length <= 2 ? (
              <div
                className={`grid h-80 sm:h-96 overflow-hidden ${post.photoUrls.length === 2 ? "grid-cols-2 gap-1.5" : "grid-cols-1"}`}
              >
                {post.photoUrls.map((url: string, i: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="w-full h-full object-contain bg-midnight-card" />
                ))}
              </div>
            ) : (
              <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
                {post.photoUrls.map((url: string, i: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="h-80 sm:h-96 w-auto shrink-0 bg-midnight-card" />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center px-4 py-4 border-b border-border-ichor">
          <StatChip label="Distance" value={`${post.workout.distanceKm}km`} />
          <StatChip label="Pace" value={formatPace(post.workout.avgPaceMinPerKm)} />
          <StatChip label="Duration" value={formatDuration(post.workout.durationSeconds)} />
          <StatChip label="Calories" value={post.workout.caloriesBurned} />
        </div>

        <div className="p-4 space-y-3">
          {post.zoneName && (
            <div className="inline-flex items-center gap-1.5 text-xs text-white/50">
              <MapPin className="w-3.5 h-3.5" /> {post.zoneName}
            </div>
          )}
          {post.dietCard && (
            <DietPill classification={post.dietCard.classification} estimatedCalories={post.dietCard.estimatedCalories} />
          )}
          <EditCaption postId={post.id} initialCaption={post.caption} isOwner={me ? String(me._id) === post.author.id : false} />

          {me && String(me._id) === post.author.id && (
            <div className="pt-1">
              <DeletePostButton postId={post.id} />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <ReactionBar
              layout="horizontal"
              postId={post.id}
              initialHype={{ count: post.hypeCount, given: post.hypeGiven }}
              initialRespect={{ count: post.respectCount, given: post.respectGiven }}
              initialChallenge={{ count: post.challengeCount, given: post.challengeGiven }}
            />
            <FlagButton postId={post.id} />
          </div>

          {post.reactionSummary && <ReactionSummary postId={post.id} summary={post.reactionSummary} />}
        </div>
      </article>

      <div className="mt-6">
        <h2 className="font-semibold text-sm text-white/60 mb-3">Comments</h2>
        <CommentSection postId={post.id} initialComments={serializedComments} />
      </div>
    </div>
  );
}
