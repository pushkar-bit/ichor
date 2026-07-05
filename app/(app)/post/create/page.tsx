import { connectDB } from "@/lib/mongodb";
import { CampusZone } from "@/models/CampusZone";
import { PostComposer } from "@/components/features/PostComposer";

export default async function CreatePostPage() {
  await connectDB();
  const zones = await CampusZone.find({}).sort({ name: 1 }).lean();
  const zoneList = zones.map((z: any) => ({ id: String(z._id), name: z.name }));

  return <PostComposer zones={zoneList} />;
}
