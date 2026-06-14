import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface TerritoryJobData {
  runId: string;
}

const territoryWorker = new Worker<TerritoryJobData>(
  'territory-processing',
  async (job: Job<TerritoryJobData>) => {
    const { runId } = job.data;
    console.log(`[Worker] Processing territory for runId=${runId}`);

    // TODO: Implement territory claim logic:
    // 1. Load the run's gpxPath from DB
    // 2. Convert polyline to polygon (convex hull or buffer)
    // 3. Find overlapping territories using PostGIS ST_Intersects
    // 4. Determine ownership changes based on run coverage
    // 5. Update Territory.ownerId and polygon in DB
    // 6. Notify affected users via FCM push notification

    console.log(`[Worker] Territory job complete for runId=${runId}`);
  },
  { connection: connection as any, concurrency: 5 },
);

territoryWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

territoryWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

export default territoryWorker;
