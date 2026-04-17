import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import * as workerController from '../controllers/workerController';

export const workerRouter = Router();

// All worker routes require authentication
workerRouter.use(authenticate);

/**
 * GET /api/v1/workers/me
 * Fetches the logged-in worker's profile
 */
workerRouter.get('/me', workerController.getProfile);

/**
 * POST /api/v1/workers/profile
 * Updated validation to include performance metrics for the Admin Dashboard
 */
workerRouter.post(
  '/profile',
  [
    body('platform').notEmpty().withMessage('Platform (e.g. Swiggy) is required'),
    body('zone').notEmpty().withMessage('Working zone is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('avgDailyHours').optional().isFloat({ min: 1, max: 16 }),
    body('upiId').optional().matches(/^[\w.\-]+@[\w]+$/).withMessage('Invalid UPI format'),
  ],
  validate,
  workerController.updateProfile
);

/**
 * POST /api/v1/workers/gps
 * ESSENTIAL: Feeds the "Geographical Risk Exposure" heatmap on the Admin side
 */
workerRouter.post(
  '/gps',
  [
    body('lat').isFloat().withMessage('Valid latitude required'),
    body('lon').isFloat().withMessage('Valid longitude required'),
  ],
  validate,
  workerController.recordGps // Ensure this is exported in your workerController
);