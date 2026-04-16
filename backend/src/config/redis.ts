import IORedis from 'ioredis';
import { logger } from './logger';

// Exporting the instance as 'redis' (standard for IORedis projects)
export const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Required for BullMQ to handle job queues correctly
  maxRetriesPerRequest: null, 
  retryStrategy: (times) => Math.min(times * 200, 3000),
  lazyConnect: true,
});

redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
redis.on('connect', () => logger.info('✓ Redis connection established'));

export async function connectRedis() {
  try {
    // Only connect if we aren't already connected
    if (redis.status === 'wait' || redis.status === 'close') {
      await redis.connect();
    }
  } catch (err) {
    logger.error({ err }, 'Failed to connect to Redis');
    throw err; // Re-throw so bootstrap knows it failed
  }
}