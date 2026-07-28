import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Comment } from "@/models/Comment";
import { Post } from "@/models/Post";
import { notify } from "@/lib/notifications";
import "@/models/User";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const comments = await Comment.find({ postId: id }).sort({ createdAt: 1 }).populate("authorId").lean();

  const serialized = comments.map((c: any) => ({
    id: String(c._id),
    parentId: c.parentId ? String(c.parentId) : null,
    text: c.text,
    createdAt: c.createdAt,
    author: { name: c.authorId?.name ?? "Athlete", avatarUrl: c.authorId?.avatarUrl ?? "" },
  }));

  return NextResponse.json({ comments: serialized });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const { text, parentId } = await req.json();

  if (!text || !text.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });

  const comment = await Comment.create({
    postId: id,
    authorId: me._id,
    parentId: parentId ?? null,
    text: text.trim(),
  });

  // A comment is its own entity, so its id IS the dedupe key — there's no toggling to guard
  // against, only a double-submit. notify() drops anything aimed at the actor themselves.
  const preview = comment.text.length > 90 ? `${comment.text.slice(0, 87)}…` : comment.text;
  const refs = { postId: id, commentId: comment._id, actorId: me._id };

  const [post, parent] = await Promise.all([
    Post.findById(id).select("userId").lean() as Promise<{ userId: unknown } | null>,
    parentId
      ? (Comment.findById(parentId).select("authorId").lean() as Promise<{ authorId: unknown } | null>)
      : Promise.resolve(null),
  ]);

  if (parent) {
    await notify(parent.authorId, "COMMENT_REPLY", `${me.name ?? "Someone"} replied to you`, preview, refs, {
      dedupeKey: `reply:${String(comment._id)}`,
    });
  }
  // The post's author always hears about a new comment — unless they're the one who was just
  // replied to, in which case the reply notification above already told them.
  const alreadyToldAuthor = parent && String(parent.authorId) === String(post?.userId);
  if (post && !alreadyToldAuthor) {
    await notify(post.userId, "POST_COMMENT", `${me.name ?? "Someone"} commented on your run`, preview, refs, {
      dedupeKey: `comment:${String(comment._id)}`,
    });
  }

  return NextResponse.json({
    id: String(comment._id),
    parentId: comment.parentId ? String(comment.parentId) : null,
    text: comment.text,
    createdAt: comment.createdAt,
    author: { name: me.name, avatarUrl: me.avatarUrl },
  });
}
