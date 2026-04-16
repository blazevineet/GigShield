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
 */
workerRouter.get('/me', workerController.getProfile);

/**
 * POST /api/v1/workers/profile
 * Validates the onboarding data before saving
 */
workerRouter.post(
  '/profile',
  [
    body('platform').notEmpty().withMessage('Platform (e.g. Swiggy) is required'),
    body('zone').notEmpty().withMessage('Working zone is required'),
    body('city').notEmpty().withMessage('City is required'),
  ],
  validate,
  workerController.updateProfile
);