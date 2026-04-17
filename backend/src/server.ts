import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { prisma } from './config/db';

// Internal Imports
import { logger } from './config/logger';
import { connectRedis, redis } from './config/redis'; 
import { startTriggerWorker } from './services/triggerWorker';
import { authRouter } from './routes/auth';
import { workerRouter } from './routes/workerRoutes';
import { policyRouter } from './routes/policies';
import { claimRouter } from './routes/claims';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// ─── Global Middleware ────────────────────────────────────
app.use(helmet());

/**
 * REFINED CORS: 
 * Explicitly allowing the frontend origins and headers.
 * Credentials: true is vital for the tab isolation strategy.
 */
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(compression());
app.use(express.json());
app.use(cookieParser());

// Morgan logger integration
app.use(morgan('combined', { 
  stream: { write: (msg: string) => logger.info(msg.trim()) } 
}));

// ─── API Routes ──────────────────────────────────────────
// Ensure your frontend service.ts URLs match these prefixes
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/workers`, workerRouter);
app.use(`${API_PREFIX}/policies`, policyRouter);
app.use(`${API_PREFIX}/claims`, claimRouter);

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date(),
    service: 'gigshield-backend',
    uptime: process.uptime()
  });
});

// ─── Error Handling ──────────────────────────────────────
app.use(errorHandler);

// ─── Bootstrap Sequence ──────────────────────────────────
async function bootstrap() {
  try {
    // 1. Database Connection Check
    await prisma.$connect();
    logger.info('✓ PostgreSQL Connected (Prisma)');

    // 2. Connect Redis (Required for BullMQ)
    await connectRedis();
    logger.info('✓ Redis Connected');

    // 3. Start Parametric Trigger Worker
    try {
      startTriggerWorker();
      logger.info('✓ Trigger Worker (Parametric Engine) active');
    } catch (workerErr) {
      logger.error({ workerErr }, 'Failed to initialize Trigger Worker');
    }

    // 4. Start HTTP server
    app.listen(PORT, () => {
      logger.info(`
      🛡️  GigShield Backend Started
      📡  URL: http://localhost:${PORT}${API_PREFIX}
      🚀  Mode: ${process.env.NODE_ENV || 'development'}
      `);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to bootstrap GigShield server');
    process.exit(1);
  }
}

// ─── Graceful Shutdown ───────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);
  
  try {
    // Close Prisma first
    await prisma.$disconnect();
    logger.info('✓ DB connection closed');
    
    // Updated line for IORedis
    if (redis) {
      await redis.quit(); 
      logger.info('✓ Redis connection closed');
    }
    
    // Optional: Add trigger worker cleanup if startTriggerWorker returns a handle
    
    logger.info('👋 Shutdown complete.');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection detected');
  // For safety in production, we exit.
  process.exit(1);
});

bootstrap();

export default app;