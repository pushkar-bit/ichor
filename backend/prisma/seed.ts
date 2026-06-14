import { PrismaClient, AttackStatus, AttackType, ClanRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  // Clean up existing data
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Comment", "Kudos", "Activity", "Run", "Attack", "ClanMember", "Clan", "Territory", "User" CASCADE;`);

  console.log('Seeding Users...');
  const users = await Promise.all([
    prisma.user.create({
      data: { clerkId: 'user_1', email: 'alice@example.com', name: 'Alice Runner', bio: 'Love sprinting' },
    }),
    prisma.user.create({
      data: { clerkId: 'user_2', email: 'bob@example.com', name: 'Bob Jogger', bio: 'Marathon training' },
    }),
    prisma.user.create({
      data: { clerkId: 'user_3', email: 'charlie@example.com', name: 'Charlie Sprinter' },
    }),
    prisma.user.create({
      data: { clerkId: 'user_4', email: 'diana@example.com', name: 'Diana Dash' },
    }),
    prisma.user.create({
      data: { clerkId: 'user_5', email: 'evan@example.com', name: 'Evan Endurance' },
    }),
  ]);

  console.log('Seeding Clans...');
  const clan1 = await prisma.clan.create({
    data: {
      name: 'Speed Demons',
      tag: 'SPED',
      leaderId: users[0].id,
      color: '#FF0000',
      description: 'Fastest runners in the city.',
      memberships: {
        create: [
          { userId: users[0].id, role: ClanRole.LEADER },
          { userId: users[1].id, role: ClanRole.MEMBER },
        ],
      },
    },
  });

  const clan2 = await prisma.clan.create({
    data: {
      name: 'Endurance Elites',
      tag: 'ENDU',
      leaderId: users[2].id,
      color: '#0000FF',
      description: 'We run far.',
      memberships: {
        create: [
          { userId: users[2].id, role: ClanRole.LEADER },
          { userId: users[3].id, role: ClanRole.MEMBER },
          { userId: users[4].id, role: ClanRole.MEMBER },
        ],
      },
    },
  });

  // Update users to have clanId reference
  await prisma.user.updateMany({ where: { id: { in: [users[0].id, users[1].id] } }, data: { clanId: clan1.id } });
  await prisma.user.updateMany({ where: { id: { in: [users[2].id, users[3].id, users[4].id] } }, data: { clanId: clan2.id } });

  console.log('Seeding Territories with PostGIS...');
  // Need to use raw SQL to insert geometry data
  const territoriesData = [
    {
      id: crypto.randomUUID(),
      ownerId: users[0].id,
      areaM2: 1500.5,
      color: '#FF0000',
      polygonGeoJSON: JSON.stringify({
        type: 'Polygon',
        coordinates: [[
          [-122.4194, 37.7749],
          [-122.4194, 37.7849],
          [-122.4094, 37.7849],
          [-122.4094, 37.7749],
          [-122.4194, 37.7749]
        ]]
      })
    },
    {
      id: crypto.randomUUID(),
      ownerId: users[2].id,
      areaM2: 2000.0,
      color: '#0000FF',
      polygonGeoJSON: JSON.stringify({
        type: 'Polygon',
        coordinates: [[
          [-122.4294, 37.7649],
          [-122.4294, 37.7749],
          [-122.4194, 37.7749],
          [-122.4194, 37.7649],
          [-122.4294, 37.7649]
        ]]
      })
    },
    {
      id: crypto.randomUUID(),
      ownerId: users[4].id,
      areaM2: 1200.0,
      color: '#00FF00',
      polygonGeoJSON: JSON.stringify({
        type: 'Polygon',
        coordinates: [[
          [-122.4394, 37.7549],
          [-122.4394, 37.7649],
          [-122.4294, 37.7649],
          [-122.4294, 37.7549],
          [-122.4394, 37.7549]
        ]]
      })
    }
  ];

  for (const t of territoriesData) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Territory" (id, "ownerId", "areaM2", color, "acquisitionDate", "lastDefended", polygon)
      VALUES (
        '${t.id}', 
        '${t.ownerId}', 
        ${t.areaM2}, 
        '${t.color}', 
        NOW(), 
        NOW(), 
        ST_GeomFromGeoJSON('${t.polygonGeoJSON}')
      );
    `);
  }

  console.log('Seeding Runs and Activities...');
  for (let i = 0; i < 10; i++) {
    const user = users[i % 5];
    const run = await prisma.run.create({
      data: {
        userId: user!.id,
        startedAt: new Date(Date.now() - Math.random() * 10000000),
        endedAt: new Date(),
        distanceKm: 5.0 + Math.random() * 5.0,
        durationSeconds: 1800 + Math.floor(Math.random() * 1800),
        avgPaceMinPerKm: 5.5 + Math.random(),
        calories: 300 + Math.floor(Math.random() * 300),
        gpxPath: [
          { lat: 37.7749, lng: -122.4194, timestamp: Date.now(), speed: 10 },
          { lat: 37.7750, lng: -122.4195, timestamp: Date.now() + 1000, speed: 11 },
        ],
      },
    });

    await prisma.activity.create({
      data: {
        userId: user!.id,
        runId: run.id,
        caption: `Great run around the block! #run${i}`,
        photoUrls: [],
        kudosCount: Math.floor(Math.random() * 10),
      },
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
