// ─── policies.ts ──────────────────────────────────────────
import { Router }   from 'express';
import { body }     from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/authenticate';
import {
  createPolicy,
  listPolicies,
  getPolicy,
  renewPolicy,
  cancelPolicy,
} from '../controllers/policyController';

export const policyRouter = Router();

policyRouter.use(authenticate);

policyRouter.get('/',     listPolicies);
policyRouter.get('/:id',  getPolicy);

/**
 * POST /api/v1/policies
 * FIX: Aligned validation keys with frontend snake_case (avg_hours, tenure_months)
 * and loosened UPI validation for demo data.
 */
policyRouter.post('/',
  authorize('WORKER'),
  [
    body('tier').isIn(['basic', 'standard', 'pro']).withMessage('Invalid tier selected'),
    body('zone').notEmpty().withMessage('Zone is required'),
    body('platform').notEmpty().withMessage('Platform is required'),
    
    // FIX: These must match the snake_case keys in your frontend payload
    body('avg_hours').exists().withMessage('Average hours (avg_hours) is required'),
    body('tenure_months').optional(),
    
    // FIX: Match 'upiId' vs 'upi_id' based on your controller destructuring
    // Also made it less strict so test IDs like 'test@upi' work.
    body('upiId').optional().notEmpty().withMessage('UPI ID cannot be empty if provided'),
    
    body('premium').optional(),
  ],
  validate,
  createPolicy,
);

policyRouter.post('/:id/renew',  authorize('WORKER'), renewPolicy);

// Changed to POST or DELETE based on your preferred frontend naming convention
policyRouter.post('/:id/cancel', authorize('WORKER'), cancelPolicy);
policyRouter.delete('/:id',      authorize('WORKER'), cancelPolicy);