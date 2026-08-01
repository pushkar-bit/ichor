import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { CoachChat } from "@/components/features/CoachChat";

export default async function CoachPage() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  return <CoachChat beginnerMode={Boolean(me?.beginnerMode)} />;
}
