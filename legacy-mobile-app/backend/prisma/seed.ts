import { SourceType, ActivityType, VerificationStatus, DietClassification, ClanRole } from '@prisma/client';
import { prisma } from '../src/db';

async function main() {
  console.log('Clearing database...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Comment", "FlameRating", "DietCard", "Post", "Workout", "Attack", "Territory", "CampusZone", "ClanMember", "Clan", "UserBadge", "LeaderboardHistory", "User" CASCADE;`);

  console.log('Seeding Users...');
  const users = await Promise.all([
    prisma.user.create({
      data: { clerkId: 'user_1', email: 'alice@iitd.ac.in', name: 'Alice Runner', bio: 'Love sprinting', totalCalories: 1200, totalDistanceKm: 15.4, totalWorkouts: 4, streakDays: 5, integrityPoints: 100 },
    }),
    prisma.user.create({
      data: { clerkId: 'user_2', email: 'bob@iitd.ac.in', name: 'Bob Jogger', bio: 'Marathon training', totalCalories: 3500, totalDistanceKm: 42.2, totalWorkouts: 6, streakDays: 3, integrityPoints: 80 },
    }),
    prisma.user.create({
      data: { clerkId: 'user_3', email: 'charlie@iitd.ac.in', name: 'Charlie Sprinter', totalCalories: 800, totalDistanceKm: 8.5, totalWorkouts: 2, streakDays: 0, integrityPoints: 50 },
    }),
    prisma.user.create({
      data: { clerkId: 'user_4', email: 'diana@iitd.ac.in', name: 'Diana Dash', totalCalories: 1800, totalDistanceKm: 22.0, totalWorkouts: 5, streakDays: 7, integrityPoints: 150 },
    }),
    prisma.user.create({
      data: { clerkId: 'user_5', email: 'evan@iitd.ac.in', name: 'Evan Endurance', totalCalories: 2500, totalDistanceKm: 30.1, totalWorkouts: 3, streakDays: 4, integrityPoints: 90 },
    }),
  ]);

  console.log('Seeding Clans...');
  const clan1 = await prisma.clan.create({
    data: {
      name: 'Speed Demons',
      tag: 'SPED',
      leaderId: users[0].id,
      color: '#FF0000',
      dietPactDescription: 'No soda or sugar this week!',
    },
  });

  const clan2 = await prisma.clan.create({
    data: {
      name: 'Endurance Elites',
      tag: 'ENDU',
      leaderId: users[2].id,
      color: '#0000FF',
      dietPactDescription: 'Only whole food carbs after workouts!',
    },
  });

  // Create clan memberships
  await prisma.clanMember.createMany({
    data: [
      { clanId: clan1.id, userId: users[0].id, role: ClanRole.LEADER },
      { clanId: clan1.id, userId: users[1].id, role: ClanRole.MEMBER },
      { clanId: clan2.id, userId: users[2].id, role: ClanRole.LEADER },
      { clanId: clan2.id, userId: users[3].id, role: ClanRole.MEMBER },
      { clanId: clan2.id, userId: users[4].id, role: ClanRole.MEMBER },
    ],
  });

  // Link users to their clans in User model
  await prisma.user.update({ where: { id: users[0].id }, data: { clanId: clan1.id } });
  await prisma.user.update({ where: { id: users[1].id }, data: { clanId: clan1.id } });
  await prisma.user.update({ where: { id: users[2].id }, data: { clanId: clan2.id } });
  await prisma.user.update({ where: { id: users[3].id }, data: { clanId: clan2.id } });
  await prisma.user.update({ where: { id: users[4].id }, data: { clanId: clan2.id } });

  console.log('Seeding Campus Zones...');
  const zoneCoords: [number, number][][] = [
    [[77.2080, 28.6130], [77.2100, 28.6130], [77.2100, 28.6148], [77.2080, 28.6148], [77.2080, 28.6130]],
    [[77.2060, 28.6148], [77.2080, 28.6148], [77.2080, 28.6160], [77.2060, 28.6160], [77.2060, 28.6148]],
    [[77.2060, 28.6120], [77.2080, 28.6120], [77.2080, 28.6130], [77.2060, 28.6130], [77.2060, 28.6120]],
    [[77.2080, 28.6110], [77.2110, 28.6110], [77.2110, 28.6130], [77.2080, 28.6130], [77.2080, 28.6110]],
    [[77.2110, 28.6130], [77.2130, 28.6130], [77.2130, 28.6150], [77.2110, 28.6150], [77.2110, 28.6130]],
    [[77.2110, 28.6150], [77.2130, 28.6150], [77.2130, 28.6170], [77.2110, 28.6170], [77.2110, 28.6150]],
    [[77.2040, 28.6130], [77.2060, 28.6130], [77.2060, 28.6150], [77.2040, 28.6150], [77.2040, 28.6130]],
    [[77.2040, 28.6110], [77.2060, 28.6110], [77.2060, 28.6130], [77.2040, 28.6130], [77.2040, 28.6110]],
  ];

  const zones = [];
  const zoneNames = ['Football Arena', 'North Hostels', 'South Hostels', 'Academic Block', 'Faculty Enclave', 'Main Gateway', 'Sports Complex East', 'Nilgiri Grounds'];
  
  for (let i = 0; i < 8; i++) {
    const coords = zoneCoords[i];
    if (!coords) continue;
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    const centroidLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centroidLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    const zone = await prisma.campusZone.create({
      data: {
        name: zoneNames[i] || `Zone ${i}`,
        description: `Campus zone covering the ${zoneNames[i] || `Zone ${i}`} area.`,
        color: i % 2 === 0 ? '#A855F7' : '#7C3AED',
        centroidLat,
        centroidLng,
      },
    });

    const polygonGeoJSON = JSON.stringify({
      type: 'Polygon',
      coordinates: [coords],
    });
    
    await prisma.$executeRawUnsafe(`
      UPDATE "CampusZone" 
      SET 
        polygon = ST_SetSRID(ST_GeomFromGeoJSON('${polygonGeoJSON}'), 4326),
        centroid = ST_SetSRID(ST_MakePoint(${centroidLng}, ${centroidLat}), 4326)
      WHERE id = '${zone.id}';
    `);

    zones.push(zone);
  }

  console.log('Seeding Territories...');
  const z0 = zones[0];
  const z1 = zones[1];
  const z3 = zones[3];
  if (z0 && z1 && z3) {
    await prisma.territory.createMany({
      data: [
        { zoneId: z0.id, ownerId: users[0].id, clanId: clan1.id, weeklyCalorieScore: 450, acquiredAt: new Date(), lastDefended: new Date() },
        { zoneId: z1.id, ownerId: users[1].id, clanId: clan1.id, weeklyCalorieScore: 320, acquiredAt: new Date(), lastDefended: new Date() },
        { zoneId: z3.id, ownerId: users[2].id, clanId: clan2.id, weeklyCalorieScore: 600, acquiredAt: new Date(), lastDefended: new Date() },
      ],
    });
  }

  console.log('Seeding Workouts & Posts...');
  for (let i = 0; i < 10; i++) {
    const user = users[i % 5];
    const zone = zones[i % 8];
    if (!user || !zone) continue;

    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
        sourceType: i % 2 === 0 ? SourceType.HEALTH_SYNC : SourceType.OCR_SCREENSHOT,
        activityType: i % 3 === 0 ? ActivityType.RUN : i % 3 === 1 ? ActivityType.WALK : ActivityType.CYCLE,
        distanceKm: 3.5 + i * 0.8,
        durationSeconds: 1200 + i * 200,
        avgPaceMinPerKm: 5.2 + (i * 0.1),
        caloriesBurned: 250 + i * 50,
        heartRateAvg: 145 + (i % 3) * 5,
        workoutDate: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000),
        externalId: `ext_workout_${i}`,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        workoutId: workout.id,
        caption: `Seeded post #${i} - feeling strong! Tagged at ${zone.name}`,
        photoUrls: [`https://picsum.photos/seed/dhaav_${i}/600/400`],
        locationZoneId: zone.id,
        isPublic: true,
        avgFlameRating: 3.5 + (i % 2) * 0.5,
        flameCount: 3,
        kudosCount: 5 + i,
      },
    });

    if (i % 2 === 0) {
      await prisma.dietCard.create({
        data: {
          postId: post.id,
          description: i % 4 === 0 ? 'Oatmeal with berries and protein shake' : 'Two slices of pepperoni pizza and soda',
          classification: i % 4 === 0 ? DietClassification.CLEAN : DietClassification.CHEAT,
          estimatedCalories: i % 4 === 0 ? 450 : 850,
          integrityBonus: i % 4 === 0 ? 50 : 0,
        },
      });
    }

    const commentAuthor = users[(i + 1) % 5];
    if (commentAuthor) {
      await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: commentAuthor.id,
          text: `Nice work! Keep pushing the limits.`,
        },
      });
    }
  }

  console.log('Seeding complete! 🚀');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
