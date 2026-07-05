/**
 * Seeds MongoDB with a full demo dataset: users, campus zones, clans, workouts,
 * posts, diet cards, flame ratings, comments, territory, and leaderboard history.
 * Run with: npm run seed
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import { User } from "../models/User";
import { CampusZone } from "../models/CampusZone";
import { Territory } from "../models/Territory";
import { Clan, ClanMember } from "../models/Clan";
import { Workout } from "../models/Workout";
import { Post } from "../models/Post";
import { DietCard } from "../models/DietCard";
import { FlameRating } from "../models/FlameRating";
import { Comment } from "../models/Comment";
import { LeaderboardHistory } from "../models/LeaderboardHistory";
import { weekKey } from "../lib/week";

const BASE_LAT = 28.6139;
const BASE_LNG = 77.209;
const DEG_PER_150M = 0.00135;

function squarePolygon(cx: number, cy: number, sizeDeg: number) {
  const h = sizeDeg / 2;
  return [
    [
      [cx - h, cy - h],
      [cx + h, cy - h],
      [cx + h, cy + h],
      [cx - h, cy + h],
      [cx - h, cy - h],
    ],
  ];
}

const ZONE_DEFS = [
  { name: "Library Zone", desc: "Silent grind, loud stats.", color: "#AE93F4", gx: 12, gy: 15 },
  { name: "Track Zone", desc: "Where the Pace Gods are made.", color: "#FDA2DE", gx: 55, gy: 10 },
  { name: "Hostel Block A", desc: "Home turf for the early risers.", color: "#D7F24C", gx: 10, gy: 55 },
  { name: "Hostel Block B", desc: "Late night cardio capital.", color: "#FF5E1A", gx: 30, gy: 60 },
  { name: "Sports Complex", desc: "Contested every single week.", color: "#AE93F4", gx: 60, gy: 45 },
  { name: "Cafeteria Quad", desc: "Diet Honesty Cards get checked here.", color: "#FDA2DE", gx: 45, gy: 75 },
  { name: "Central Lawn", desc: "The most fought-over patch of grass on campus.", color: "#D7F24C", gx: 75, gy: 70 },
  { name: "Stadium Loop", desc: "Home of the Calorie King.", color: "#FF5E1A", gx: 78, gy: 20 },
];

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
    CampusZone.deleteMany({}),
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

  console.log("Seeding campus zones...");
  const zones = await CampusZone.insertMany(
    ZONE_DEFS.map((z) => {
      const cx = BASE_LNG + (z.gx / 100) * 0.01 * 8;
      const cy = BASE_LAT - (z.gy / 100) * 0.01 * 8;
      return {
        name: z.name,
        description: z.desc,
        color: z.color,
        polygon: { type: "Polygon", coordinates: squarePolygon(cx, cy, DEG_PER_150M) },
        centroid: { type: "Point", coordinates: [cx, cy] },
        gridX: z.gx,
        gridY: z.gy,
        gridW: 16,
        gridH: 14,
      };
    }),
  );

  console.log("Seeding users...");
  const users = await User.insertMany(
    USER_DEFS.map((u, i) => ({
      clerkId: u.handle,
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

  console.log("Seeding territory...");
  for (let i = 0; i < zones.length; i++) {
    if (i % 4 === 3) continue; // leave some zones unclaimed
    const owner = pick(users);
    await Territory.create({
      zoneId: zones[i]._id,
      ownerId: owner._id,
      clanId: owner.clanId ?? null,
      weeklyCalorieScore: randInt(400, 4000),
      acquiredAt: daysAgo(randInt(1, 6)),
      lastDefended: daysAgo(randInt(0, 3)),
    });
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

      const zone = Math.random() > 0.3 ? pick(zones) : null;
      const post = await Post.create({
        userId: user._id,
        workoutId: workout._id,
        caption: pick(CAPTIONS),
        photoUrls: [`https://picsum.photos/seed/${pick(photoSeeds)}${day}${p}/800/450`],
        locationZoneId: zone?._id ?? null,
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

  console.log(`Done. Seeded ${users.length} users, ${zones.length} zones, ${clans.length} clans.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
