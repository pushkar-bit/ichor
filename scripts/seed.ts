/**
 * Seeds MongoDB with a full demo dataset: users, clans, workouts (some with GPS routes
 * that claim run-shaped territories through the real engine), posts, diet cards, flame
 * ratings, comments, and leaderboard history.
 * Run with: npm run seed
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import { User } from "../models/User";
import { Territory } from "../models/Territory";
import { Clan, ClanMember } from "../models/Clan";
import { Workout } from "../models/Workout";
import { Post } from "../models/Post";
import { DietCard } from "../models/DietCard";
import { FlameRating } from "../models/FlameRating";
import { Comment } from "../models/Comment";
import { LeaderboardHistory } from "../models/LeaderboardHistory";
import { weekKey } from "../lib/week";
import { processRunForTerritory } from "../lib/territoryEngine";

const BASE_LAT = 28.6139;
const BASE_LNG = 77.209;

/**
 * Synthesizes a plausible GPS trace (point every ~25m) so seeded runs exercise the real
 * territory engine. "loop" traces a rectangle back to the start (fills as one solid
 * territory); "outback" goes out along a bearing and returns (a corridor strip).
 */
function makeRoute(
  startLng: number,
  startLat: number,
  distanceKm: number,
  bearingDeg: number,
  shape: "loop" | "outback",
): [number, number][] {
  const stepKm = 0.025;
  const steps = Math.max(4, Math.round(distanceKm / stepKm));
  const degPerKmLat = 1 / 110.574;
  const degPerKmLng = 1 / (111.32 * Math.cos((startLat * Math.PI) / 180));
  const points: [number, number][] = [];

  if (shape === "outback") {
    const rad = (bearingDeg * Math.PI) / 180;
    const half = Math.ceil(steps / 2);
    for (let i = 0; i <= half; i++) {
      const km = i * stepKm;
      points.push([
        startLng + Math.sin(rad) * km * degPerKmLng,
        startLat + Math.cos(rad) * km * degPerKmLat,
      ]);
    }
    for (let i = half - 1; i >= 0; i--) points.push(points[i]);
    return points;
  }

  // Rectangle loop with the requested perimeter, rotated by the bearing.
  const rad = (bearingDeg * Math.PI) / 180;
  const w = distanceKm * 0.3;
  const h = distanceKm * 0.2;
  const corners: [number, number][] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
    [0, 0],
  ];
  const rotated = corners.map(([x, y]): [number, number] => [
    x * Math.cos(rad) - y * Math.sin(rad),
    x * Math.sin(rad) + y * Math.cos(rad),
  ]);
  for (let c = 0; c < rotated.length - 1; c++) {
    const [x1, y1] = rotated[c];
    const [x2, y2] = rotated[c + 1];
    const segKm = Math.hypot(x2 - x1, y2 - y1);
    const segSteps = Math.max(1, Math.round(segKm / stepKm));
    for (let i = 0; i < segSteps; i++) {
      const f = i / segSteps;
      points.push([
        startLng + (x1 + (x2 - x1) * f) * degPerKmLng,
        startLat + (y1 + (y2 - y1) * f) * degPerKmLat,
      ]);
    }
  }
  points.push(points[0]);
  return points;
}

const USER_DEFS = [
  { name: "Arjun Mehta", email: "arjun@college.edu", handle: "seed_arjun" },
  { name: "Priya Nair", email: "priya@college.edu", handle: "seed_priya" },
  { name: "Rohan Verma", email: "rohan@college.edu", handle: "seed_rohan" },
  { name: "Sana Sheikh", email: "sana@college.edu", handle: "seed_sana" },
  { name: "Kabir Singh", email: "kabir@college.edu", handle: "seed_kabir" },
  { name: "Ishaan Rao", email: "ishaan@college.edu", handle: "seed_ishaan" },
  { name: "Meera Iyer", email: "meera@college.edu", handle: "seed_meera" },
  { name: "Dev Malhotra", email: "dev@college.edu", handle: "seed_dev" },
];

const DIET_SAMPLES = [
  { text: "Grilled chicken breast, brown rice, and steamed veggies", classification: "CLEAN" as const },
  { text: "Oats with fruit and a protein shake", classification: "CLEAN" as const },
  { text: "Pizza and fries with a coke", classification: "CHEAT" as const },
  { text: "Burger and onion rings after the run", classification: "CHEAT" as const },
  { text: "Just some rice and dal, nothing special", classification: "NEUTRAL" as const },
];

const CAPTIONS = [
  "Campus was quiet, legs were not.",
  "Beat yesterday's split by 12 seconds. Small wins.",
  "Zone claimed. Come take it back.",
  "Rain run hits different.",
  "Recovery jog turned into a tempo by accident.",
  "5am club checking in.",
  "Legs are gone but the zone is mine.",
  "This one was for the leaderboard.",
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  await connectDB();
  console.log("Connected to MongoDB. Clearing existing demo data...");

  await Promise.all([
    User.deleteMany({}),
    Territory.deleteMany({}),
    Clan.deleteMany({}),
    ClanMember.deleteMany({}),
    Workout.deleteMany({}),
    Post.deleteMany({}),
    DietCard.deleteMany({}),
    FlameRating.deleteMany({}),
    Comment.deleteMany({}),
    LeaderboardHistory.deleteMany({}),
  ]);

  console.log("Seeding users...");
  const users = await User.insertMany(
    USER_DEFS.map((u, i) => ({
      googleId: u.handle,
      email: u.email,
      name: u.name,
      avatarUrl: `https://api.dicebear.com/9.x/notionists/svg?seed=${u.handle}`,
      bio: "Campus athlete. Here to dominate.",
      totalDistanceKm: randInt(20, 180),
      totalWorkouts: randInt(10, 60),
      totalCalories: randInt(4000, 30000),
      streakDays: randInt(0, 21),
      bestStreakDays: randInt(5, 30),
      integrityPoints: randInt(0, 1600),
      battlesWon: randInt(0, 12),
      battlesLost: randInt(0, 8),
      badges: i < 3 ? ["FIRST_WORKOUT"] : [],
    })),
  );

  console.log("Seeding clans...");
  const clanDefs = [
    { name: "Iron Lungs", tag: "IRON", color: "#AE93F4", pact: "No sugar this week" },
    { name: "Midnight Milers", tag: "MDNT", color: "#FDA2DE", pact: "Clean eating streak" },
  ];
  const clans = [];
  for (let i = 0; i < clanDefs.length; i++) {
    const leader = users[i * 3];
    const clan = await Clan.create({
      name: clanDefs[i].name,
      tag: clanDefs[i].tag,
      leaderId: leader._id,
      color: clanDefs[i].color,
      dietPactDescription: clanDefs[i].pact,
      battlesWon: randInt(0, 5),
    });
    clans.push(clan);
    await ClanMember.create({ clanId: clan._id, userId: leader._id, role: "LEADER" });
    leader.clanId = clan._id;
    await leader.save();
    for (let m = 1; m <= 2; m++) {
      const member = users[i * 3 + m];
      if (!member) continue;
      await ClanMember.create({ clanId: clan._id, userId: member._id, role: "MEMBER" });
      member.clanId = clan._id;
      await member.save();
    }
  }

  console.log("Seeding territory runs (GPS routes through the real claim engine)...");
  // A few dedicated route-bearing runs per user, spread around the base coords so each
  // claims distinct land. Goes through processRunForTerritory — exactly the webhook path.
  const routeShapes: ("loop" | "outback")[] = ["loop", "outback"];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const runsForUser = i < 3 ? 2 : 1; // first three users get bigger empires
    for (let r = 0; r < runsForUser; r++) {
      const angle = ((i * 47 + r * 133) % 360) * (Math.PI / 180);
      const spreadKm = 1.2 + ((i * 3 + r * 5) % 7) * 0.8;
      const startLng = BASE_LNG + Math.sin(angle) * spreadKm * 0.009;
      const startLat = BASE_LAT + Math.cos(angle) * spreadKm * 0.009;
      const distanceKm = Math.round((3 + ((i + r) % 5) * 1.5) * 10) / 10;
      const durationSeconds = Math.round(distanceKm * randInt(300, 380));
      const route = makeRoute(startLng, startLat, distanceKm, (i * 61 + r * 29) % 360, pick(routeShapes));
      const workoutDate = new Date(daysAgo(randInt(1, 8)).setHours(randInt(5, 20), randInt(0, 59)));

      const workout = await Workout.create({
        userId: user._id,
        sourceType: "HEALTH_SYNC",
        activityType: "RUN",
        distanceKm,
        durationSeconds,
        avgPaceMinPerKm: Math.round((durationSeconds / 60 / distanceKm) * 100) / 100,
        caloriesBurned: Math.round(distanceKm * randInt(55, 70)),
        heartRateAvg: randInt(130, 175),
        workoutDate,
        verificationStatus: "VERIFIED",
        externalId: `seed:${user._id}:${r}`,
        route: { type: "LineString", coordinates: route },
      });

      const result = await processRunForTerritory(user, workout as any);
      await Post.create({
        userId: user._id,
        workoutId: workout._id,
        caption: result.claimed ? `Claimed ${result.claimed.name}.` : pick(CAPTIONS),
        photoUrls: [`https://picsum.photos/seed/territory${i}${r}/800/450`],
        isPublic: true,
        createdAt: workoutDate,
      });
    }
  }

  console.log("Seeding workouts + posts + diet cards + engagement...");
  const activityTypes = ["RUN", "WALK", "CYCLE"] as const;
  const sourceTypes = ["HEALTH_SYNC", "OCR_SCREENSHOT", "MANUAL"] as const;
  const photoSeeds = ["run1", "run2", "run3", "run4", "run5", "trail1", "track1", "sunset1"];

  for (let day = 9; day >= 0; day--) {
    const postsToday = randInt(2, 4);
    for (let p = 0; p < postsToday; p++) {
      const user = pick(users);
      const activityType = pick([...activityTypes, "RUN", "RUN"]); // bias toward RUN
      const distanceKm = Math.round((2 + Math.random() * 10) * 10) / 10;
      const durationSeconds = Math.round(distanceKm * randInt(280, 400));
      const avgPaceMinPerKm = Math.round((durationSeconds / 60 / distanceKm) * 100) / 100;
      const caloriesBurned = Math.round(distanceKm * randInt(55, 70));
      const workoutDate = new Date(daysAgo(day).setHours(randInt(5, 20), randInt(0, 59)));

      const workout = await Workout.create({
        userId: user._id,
        sourceType: pick([...sourceTypes]),
        activityType,
        distanceKm,
        durationSeconds,
        avgPaceMinPerKm: activityType === "RUN" ? avgPaceMinPerKm : null,
        caloriesBurned,
        heartRateAvg: randInt(130, 175),
        workoutDate,
        verificationStatus: "VERIFIED",
      });

      const post = await Post.create({
        userId: user._id,
        workoutId: workout._id,
        caption: pick(CAPTIONS),
        photoUrls: [`https://picsum.photos/seed/${pick(photoSeeds)}${day}${p}/800/450`],
        isPublic: true,
        createdAt: workoutDate,
      });
      await Post.updateOne({ _id: post._id }, { $set: { createdAt: workoutDate } });

      if (Math.random() > 0.35) {
        const sample = pick(DIET_SAMPLES);
        const integrityBonus = sample.classification === "CLEAN" ? 50 : sample.classification === "NEUTRAL" ? 25 : 0;
        await DietCard.create({
          postId: post._id,
          description: sample.text,
          classification: sample.classification,
          estimatedCalories: randInt(400, 1200),
          integrityBonus,
          suggestion:
            sample.classification === "CLEAN"
              ? "Solid fuel. Keep it up."
              : sample.classification === "CHEAT"
                ? "Get back on track tomorrow."
                : "Log more detail next time.",
        });
      }

      const raters = users.filter((u) => String(u._id) !== String(user._id)).slice(0, randInt(1, 5));
      let ratingSum = 0;
      for (const rater of raters) {
        const rating = randInt(2, 5);
        ratingSum += rating;
        await FlameRating.create({ postId: post._id, userId: rater._id, rating });
      }
      if (raters.length > 0) {
        await Post.updateOne(
          { _id: post._id },
          { $set: { avgFlameRating: Math.round((ratingSum / raters.length) * 10) / 10, flameCount: raters.length } },
        );
      }

      const kudosGivers = users.filter((u) => String(u._id) !== String(user._id)).slice(0, randInt(0, 4));
      if (kudosGivers.length) {
        await Post.updateOne(
          { _id: post._id },
          { $set: { kudosCount: kudosGivers.length, kudosUserIds: kudosGivers.map((u) => u._id) } },
        );
      }

      if (Math.random() > 0.6) {
        const commenter = pick(users);
        await Comment.create({
          postId: post._id,
          authorId: commenter._id,
          text: pick([
            "Beast mode. Respect.",
            "That pace though 🔥",
            "Taking this zone back tomorrow.",
            "Diet card checks out, clean week for you.",
            "Let's go! Clan proud.",
          ]),
        });
      }
    }
  }

  console.log("Seeding leaderboard history...");
  const lastWeek = weekKey(daysAgo(7));
  const shuffled = [...users].sort(() => Math.random() - 0.5);
  for (const category of ["CALORIE_KING", "GRIND_STREAK", "PACE_GOD", "DISTANCE_DESTROYER"]) {
    for (let rank = 1; rank <= 3; rank++) {
      await LeaderboardHistory.create({
        week: lastWeek,
        category,
        userId: shuffled[rank - 1]._id,
        score: randInt(1000, 8000),
        rank,
      });
    }
  }

  const territoryCount = await Territory.countDocuments({});
  console.log(`Done. Seeded ${users.length} users, ${territoryCount} territories, ${clans.length} clans.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
