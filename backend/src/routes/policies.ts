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
policyRouter.post('/',
  authorize('WORKER'),
  [
    body('tier').isIn(['basic', 'standard', 'pro']),
    body('zone').notEmpty(),
    body('platform').notEmpty(),
    body('upi_id').matches(/^[\w.\-]+@[\w]+$/).withMessage('Valid UPI ID required'),
  ],
  validate,
  createPolicy,
);
policyRouter.post('/:id/renew',  authorize('WORKER'), renewPolicy);
policyRouter.delete('/:id',      authorize('WORKER'), cancelPolicy);
