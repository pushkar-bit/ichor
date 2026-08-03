import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Workout } from "@/models/Workout";
import { computeProgramProgress, pickByDay, restDayNotice, MOTIVATIONAL_QUOTES } from "@/lib/beginnerProgram";
import { getAge, minRestDaysForAge } from "@/lib/age";
import { StartView } from "@/components/features/StartView";

export default async function StartPage() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return null;

  const quote = pickByDay(MOTIVATIONAL_QUOTES);

  if (!me.beginnerMode) {
    // Reachable even outside Beginner-Friendly Mode (e.g. typed the URL, or wants to turn it
    // on later having skipped "yes" at onboarding) — StartView renders an opt-in screen here
    // instead of the program itself. Resolved via plain props per the /feed data-props note.
    return <StartView optedIn={false} name={me.name} quote={quote} />;
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

  const now = new Date();
  const age = me.birthDate ? getAge(me.birthDate) : null;
  const progress = computeProgramProgress(
    startedAt,
    recentWorkouts.map((w: any) => new Date(w.workoutDate)),
    now,
    minRestDaysForAge(age),
  );

  // Resolved here rather than in the client component so the "tomorrow / in N days" wording
  // comes off the server clock and can't hydrate-mismatch against the viewer's.
  const restNotice = restDayNotice(progress, now);

  return <StartView optedIn name={me.name} progress={progress} quote={quote} restNotice={restNotice} />;
}
