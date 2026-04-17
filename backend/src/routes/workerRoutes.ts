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
 * FIX: Realigned validation keys to match frontend snake_case (avg_hours, tenure_months)
 */
workerRouter.post(
  '/profile',
  [
    body('platform').notEmpty().withMessage('Platform is required'),
    body('zone').notEmpty().withMessage('Working zone is required'),
    body('city').notEmpty().withMessage('City is required'),
    
    // MATCHING FRONTEND: These must match the keys seen in your console screenshots
    body('avg_hours').exists().withMessage('Average daily hours (avg_hours) is required'),
    body('tenure_months').optional(),
    
    body('name').optional().isString(),
    body('upiId').optional().notEmpty().withMessage('UPI ID cannot be empty if provided'),
  ],
  validate,
  workerController.updateProfile
);

/**
 * POST /api/v1/workers/gps
 */
workerRouter.post(
  '/gps',
  [
    body('lat').isNumeric().withMessage('Valid latitude required'),
    body('lon').isNumeric().withMessage('Valid longitude required'),
    body('accuracy').optional().isNumeric(),
    body('speed').optional().isNumeric(),
  ],
  validate,
  workerController.recordGps
);