import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/requireAuth';
import { addTerritoryJob } from '../queues/territoryQueue';

const router = Router();
const prisma = new PrismaClient();

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const GpxPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.number(),
  speed: z.number(),
});

const SaveRunSchema = z.object({
  gpxPath: z.array(GpxPointSchema).min(2, 'At least 2 GPS points required'),
  distanceKm: z.number().positive('Distance must be positive'),
  durationSeconds: z.number().int().positive('Duration must be positive'),
  avgPaceMinPerKm: z.number().positive('Pace must be positive'),
  calories: z.number().int().nonnegative('Calories cannot be negative'),
  mapScreenshotUrl: z.string().url().optional(),
  isPublic: z.boolean().default(true),
});

// ─── POST /api/runs ───────────────────────────────────────────────────────────

router.post('/', requireAuth, async (req: Request, res: Response) => {
  // 1. Validate request body
  const parseResult = SaveRunSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { gpxPath, distanceKm, durationSeconds, avgPaceMinPerKm, calories, mapScreenshotUrl, isPublic } =
    parseResult.data;

  try {
    const clerkId = req.auth.userId;

    // 2. Resolve internal user ID from Clerk ID
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please sync your account.' });
    }

    // 3. Persist the run
    const run = await prisma.run.create({
      data: {
        userId: user.id,
        startedAt: new Date(gpxPath[0]!.timestamp),
        endedAt: new Date(gpxPath[gpxPath.length - 1]!.timestamp),
        distanceKm,
        durationSeconds,
        avgPaceMinPerKm,
        calories,
        gpxPath,       // stored as Json column
        mapScreenshotUrl: mapScreenshotUrl ?? null,
        isPublic,
      },
    });

    // 4. Update user aggregate stats (non-blocking fire-and-forget)
    prisma.user.update({
      where: { id: user.id },
      data: {
        totalRuns: { increment: 1 },
        totalDistance: { increment: distanceKm },
      },
    }).catch((err) => console.error('[Stats] Failed to update user stats:', err));

    // 5. Enqueue territory processing — does NOT block the response
    addTerritoryJob(run.id).catch((err) =>
      console.error('[Queue] Failed to enqueue territory job:', err),
    );

    // 6. Respond immediately
    return res.status(201).json({ success: true, runId: run.id });
  } catch (error) {
    console.error('[POST /api/runs]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/runs/:id ────────────────────────────────────────────────────────

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const run = await prisma.run.findUnique({ where: { id: req.params.id } });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    return res.status(200).json({ run });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/runs (current user's runs) ─────────────────────────────────────

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { clerkId: req.auth.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const runs = await prisma.run.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return res.status(200).json({ runs });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
