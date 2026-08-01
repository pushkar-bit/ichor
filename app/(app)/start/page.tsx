import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Workout } from "@/models/Workout";
import { computeProgramProgress } from "@/lib/beginnerProgram";
import { StartView } from "@/components/features/StartView";

export default async function StartPage() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return null;

  if (!me.beginnerMode) {
    // Reachable even outside Beginner-Friendly Mode (e.g. typed the URL, or wants to turn it
    // on later having skipped "yes" at onboarding) — StartView renders an opt-in screen here
    // instead of the program itself. Resolved via plain props per the /feed data-props note.
    return <StartView optedIn={false} name={me.name} />;
  }

  const startedAt = me.beginnerModeStartedAt ?? me.createdAt ?? new Date();
  const since = new Date(startedAt.getTime() - 1000);
  const recentWorkouts = await Workout.find({
    userId: me._id,
    activityType: { $in: ["RUN", "WALK"] },
    workoutDate: { $gte: since },
  })
    .select("workoutDate")
    .lean();

  const progress = computeProgramProgress(
    startedAt,
    recentWorkouts.map((w: any) => new Date(w.workoutDate)),
  );

  return <StartView optedIn name={me.name} progress={progress} />;
}
