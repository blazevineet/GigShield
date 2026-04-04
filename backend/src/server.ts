import 'dotenv/config';
import app from './app';
import { logger } from './config/logger';
import { connectRedis } from './config/redis';
import { startTriggerWorker } from './services/triggerWorker';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function bootstrap() {
  try {
    // Connect Redis
    await connectRedis();
    logger.info('✓ Redis connected');

    // Start background trigger polling worker
    startTriggerWorker();
    logger.info('✓ Trigger worker started');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`✓ GigShield API running on http://localhost:${PORT}`);
      logger.info(`✓ Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to bootstrap server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
  process.exit(1);
});

bootstrap();
