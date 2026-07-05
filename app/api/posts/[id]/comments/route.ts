import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Comment } from "@/models/Comment";
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

  return NextResponse.json({
    id: String(comment._id),
    parentId: comment.parentId ? String(comment.parentId) : null,
    text: comment.text,
    createdAt: comment.createdAt,
    author: { name: me.name, avatarUrl: me.avatarUrl },
  });
}
