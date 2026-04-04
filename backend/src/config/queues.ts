import { Queue, Worker } from 'bullmq';
import { redis }   from './redis';
import { logger }  from './logger';
import { prisma }  from './db';
import { initiatePayout } from '../services/payoutService';

// ─── Queues ────────────────────────────────────────────────
export const claimQueue = new Queue('claims', {
  connection:     redis,
  defaultJobOptions: {
    attempts:     3,
    backoff:      { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail:     { count: 500 },
  },
});

export const payoutQueue = new Queue('payouts', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff:  { type: 'exponential', delay: 3000 },
  },
});

// ─── Workers ───────────────────────────────────────────────
export const claimWorker = new Worker(
  'claims',
  async (job) => {
    const { claimId, upiId, amount } = job.data;
    logger.info({ claimId, amount }, 'Processing claim payout job');

    const result = await initiatePayout({ claimId, upiId, amount });

    await prisma.claim.update({
      where: { id: claimId },
      data:  { status: 'PAID', resolvedAt: new Date() },
    });

    return result;
  },
  { connection: redis, concurrency: 10 },
);

claimWorker.on('completed', (job) => logger.info({ jobId: job.id }, 'Claim job completed'));
claimWorker.on('failed',    (job, err) => logger.error({ jobId: job?.id, err }, 'Claim job failed'));
