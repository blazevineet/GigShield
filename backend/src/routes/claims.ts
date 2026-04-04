import { Router } from 'express';
import { body }   from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/authenticate';
import {
  listClaims,
  getClaim,
  autoTriggerClaim,
  reviewClaim,
} from '../controllers/claimsController';

export const claimRouter = Router();

claimRouter.use(authenticate);

claimRouter.get('/',          listClaims);
claimRouter.get('/:id',       getClaim);

// Internal: called by trigger worker (restricted to service key in production)
claimRouter.post('/trigger',
  authorize('ADMIN'),
  [
    body('policyId').isUUID(),
    body('triggerType').isIn(['HEAVY_RAINFALL','EXTREME_HEAT','FLOOD_ALERT','SEVERE_AQI','ORDER_COLLAPSE','CURFEW_BANDH']),
    body('triggerValue').isFloat(),
    body('threshold').isFloat(),
  ],
  validate,
  autoTriggerClaim,
);

// Admin review of held claims
claimRouter.patch('/:id/review',
  authorize('ADMIN', 'INSURER'),
  [
    body('decision').isIn(['APPROVED', 'REJECTED']),
    body('adjusterNotes').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  reviewClaim,
);
