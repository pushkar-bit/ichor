import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post";
import "@/models/User";
import "@/models/Workout";

export async function GET() {
  await connectDB();
  const posts = await Post.find({ flagCount: { $gte: 3 } }).populate("userId").populate("workoutId").sort({ flagCount: -1 }).lean();

  return NextResponse.json({
    posts: posts.map((p: any) => ({
      id: String(p._id),
      authorName: p.userId?.name,
      caption: p.caption,
      photoUrl: p.photoUrls[0] ?? null,
      screenshotUrl: p.workoutId?.screenshotUrl ?? null,
      flagCount: p.flagCount,
      isHidden: p.isHidden,
      verificationStatus: p.workoutId?.verificationStatus,
      createdAt: p.createdAt,
    })),
  });
}
