import { NextResponse } from "next/server";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post";
import { notify } from "@/lib/notifications";
import { NextRequest } from "next/server";

type ReactionType = "HYPE" | "RESPECT" | "CHALLENGE";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getOrCreateCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type } = await req.json(); // "HYPE", "RESPECT", or "CHALLENGE"
    if (!["HYPE", "RESPECT", "CHALLENGE"].includes(type)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    await connectDB();
    const resolvedParams = await params;
    const postId = resolvedParams.id;
    const post = await Post.findById(postId);

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const arrayMap = {
      HYPE: "hypeUserIds",
      RESPECT: "respectUserIds",
      CHALLENGE: "challengeUserIds",
    };
    const countMap = {
      HYPE: "hypeCount",
      RESPECT: "respectCount",
      CHALLENGE: "challengeCount",
    };

    const arrayName = arrayMap[type as keyof typeof arrayMap];
    const countName = countMap[type as keyof typeof countMap];

    const hasReacted = post[arrayName].includes(me._id);

    if (hasReacted) {
      post[arrayName] = post[arrayName].filter((id: any) => id.toString() !== me._id.toString());
      post[countName] = Math.max(0, post[countName] - 1);
    } else {
      post[arrayName].push(me._id);
      post[countName] += 1;
    }

    await post.save();

    // Only on the way in, and only once ever per (reactor, post, type) — the dedupeKey means
    // toggling a reaction off and on again can't re-ring the author's bell.
    if (!hasReacted) {
      const label = { HYPE: "hyped", RESPECT: "respected", CHALLENGE: "challenged" }[type as ReactionType];
      await notify(
        post.userId,
        "POST_REACTION",
        `${me.name ?? "Someone"} ${label} your run`,
        "",
        { postId: post._id, actorId: me._id },
        { dedupeKey: `react:${String(me._id)}:${String(post._id)}:${type}` },
      );
    }

    return NextResponse.json({
      success: true,
      hasReacted: !hasReacted,
      count: post[countName],
    });
  } catch (error) {
    console.error("Reaction Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

