import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, MapPin, Camera } from "lucide-react";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import { DietCard } from "@/models/DietCard";
import { Comment } from "@/models/Comment";
import { CampusZone } from "@/models/CampusZone";
import "@/models/User";
import "@/models/Workout";
import { serializePost } from "@/lib/serialize";
import { Avatar } from "@/components/ui/Avatar";
import { StatChip } from "@/components/ui/StatChip";
import { FlamePicker } from "@/components/features/FlamePicker";
import { KudosButton } from "@/components/features/KudosButton";
import { CommentSection } from "@/components/features/CommentSection";
import { FlagButton } from "@/components/features/FlagButton";
import { DietPill } from "@/components/features/ActivityCard";
import { EditCaption } from "@/components/features/EditCaption";
import { timeAgo, formatPace, formatDuration } from "@/lib/utils";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const me = await getOrCreateCurrentUser();

  const postDoc = await Post.findById(id).populate("userId").populate("workoutId").lean();
  if (!postDoc) notFound();

  const [dietCard, comments, zone] = await Promise.all([
    DietCard.findOne({ postId: id }).lean(),
    Comment.find({ postId: id }).sort({ createdAt: 1 }).populate("authorId").lean(),
    (postDoc as any).locationZoneId ? CampusZone.findById((postDoc as any).locationZoneId).lean() : null,
  ]);

  const post = serializePost(
    { ...postDoc, dietCard, commentCount: comments.length, zoneName: (zone as any)?.name ?? null },
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
          <Avatar src={post.author.avatarUrl} name={post.author.name} size={40} />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{post.author.name}</span>
            <div className="text-xs text-white/40">{timeAgo(post.createdAt)}</div>
          </div>
          <span className="text-[11px] font-medium text-momentum bg-momentum/10 px-2 py-1 rounded-full">
            {post.workout.activityType}
          </span>
        </div>

        {post.photoUrls.length > 0 && (
          <div className="grid grid-cols-1 gap-0.5">
            {post.photoUrls.map((url: string, i: number) => (
              <div key={i} className="relative w-full aspect-video bg-midnight-card">
                <Image src={url} alt="" fill unoptimized className="object-cover" />
              </div>
            ))}
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

          {post.workout.screenshotUrl && (
            <div className="border border-border-ichor rounded-xl p-3 flex items-center gap-2 text-xs text-white/50">
              <Camera className="w-4 h-4" /> Verified screenshot attached
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <FlamePicker postId={post.id} initialAvg={post.avgFlameRating} initialCount={post.flameCount} />
            <div className="flex items-center gap-3">
              <KudosButton postId={post.id} initialCount={post.kudosCount} initialGiven={post.kudosGiven} />
              <FlagButton postId={post.id} />
            </div>
          </div>
        </div>
      </article>

      <div className="mt-6">
        <h2 className="font-semibold text-sm text-white/60 mb-3">Comments</h2>
        <CommentSection postId={post.id} initialComments={serializedComments} />
      </div>
    </div>
  );
}
