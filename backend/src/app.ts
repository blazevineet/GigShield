import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { workerRouter } from './routes/workers';
import { policyRouter } from './routes/policies';
import { claimRouter } from './routes/claims';
import { triggerRouter } from './routes/triggers';
import { adminRouter } from './routes/admin';
import { payoutRouter } from './routes/payouts';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { logger } from './config/logger';

const app: Application = express();

app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || '').split(','),
  credentials: true,
}));

app.use(compression());
app.use(express.json());
app.use(morgan('combined', {
  stream: { write: (msg: string) => logger.info(msg.trim()) },
}));

const API = process.env.API_PREFIX || '/api/v1';

// Mount all routers
app.use(`${API}/auth`, authRouter);
app.use(`${API}/workers`, workerRouter);
app.use(`${API}/policies`, policyRouter);
app.use(`${API}/claims`, claimRouter);
app.use(`${API}/triggers`, triggerRouter);
app.use(`${API}/payouts`, payoutRouter);
app.use(`${API}/admin`, adminRouter);

app.use(notFound);
app.use(errorHandler);

export default app;