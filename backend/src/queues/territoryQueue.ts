import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
});

export const territoryQueue = new Queue('territory-processing', { connection: connection as any });

export async function addTerritoryJob(runId: string): Promise<void> {
  await territoryQueue.add(
    'process-territory',
    { runId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );
  console.log(`[Queue] Territory job queued for runId=${runId}`);
}
