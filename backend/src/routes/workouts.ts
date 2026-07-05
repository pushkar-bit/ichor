import express from 'express';
import { PrismaClient, SourceType, ActivityType, VerificationStatus } from '@prisma/client';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/workouts/sync: sync/dedup workouts from health stores
router.post('/sync', requireAuth, async (req: any, res) => {
  const workouts = req.body;
  if (!Array.isArray(workouts)) {
    return res.status(400).json({ error: 'Body must be an array of workouts' });
  }

  const userId = req.auth.userId;
  let createdCount = 0;
  let skippedCount = 0;

  try {
    for (const w of workouts) {
      if (!w.externalId) continue;

      // Check if already exists
      const existing = await prisma.workout.findUnique({
        where: {
          userId_externalId: {
            userId,
            externalId: w.externalId,
          },
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Create new workout
      await prisma.workout.create({
        data: {
          userId,
          sourceType: SourceType.HEALTH_SYNC,
          activityType: w.activityType as ActivityType,
          distanceKm: parseFloat(w.distanceKm),
          durationSeconds: parseInt(w.durationSeconds),
          avgPaceMinPerKm: w.avgPaceMinPerKm ? parseFloat(w.avgPaceMinPerKm) : null,
          caloriesBurned: parseInt(w.caloriesBurned),
          heartRateAvg: w.heartRateAvg ? parseInt(w.heartRateAvg) : null,
          workoutDate: new Date(w.workoutDate),
          externalId: w.externalId,
          verificationStatus: VerificationStatus.VERIFIED, // verified because it came from health store
        },
      });
      createdCount++;
    }

    res.json({ created: createdCount, alreadyExists: skippedCount });
  } catch (error) {
    console.error('Error syncing workouts:', error);
    res.status(500).json({ error: 'Workout sync failed' });
  }
});

export default router;
