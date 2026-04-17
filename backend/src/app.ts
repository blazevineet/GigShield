import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

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

// 1. Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Useful for demo if you're loading maps/external assets
}));

app.use(cors({
  // Adding localhost:5173 just in case you switched from CRA to Vite
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:5173'], 
  credentials: true,
}));

app.use(compression());
app.use(express.json()); // Essential for POST requests (GPS/Profile)

app.use(morgan('combined', {
  stream: { write: (msg: string) => logger.info(msg.trim()) },
}));

// 2. API Prefix Configuration
const API = process.env.API_PREFIX || '/api/v1'; 

// 3. Router Mounting 
// Note: We use the prefix consistently to avoid 404s
app.use(`${API}/auth`, authRouter);
app.use(`${API}/workers`, workerRouter); // Handles /profile, /me, and /gps
app.use(`${API}/policies`, policyRouter);
app.use(`${API}/claims`, claimRouter);
app.use(`${API}/triggers`, triggerRouter);
app.use(`${API}/payouts`, payoutRouter);
app.use(`${API}/admin`, adminRouter);     // Handles /stats, /heatmap, /forecast

// 4. Fallback for undefined routes (the 404 handler)
app.use(notFound);

// 5. Global Error Handler
app.use(errorHandler);

export default app;