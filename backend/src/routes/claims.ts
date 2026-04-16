import { Router } from 'express';
import { body } from 'express-validator';
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

claimRouter.get('/', listClaims);
claimRouter.get('/:id', getClaim);

/**
 * 1. WORKER AUTO-TRIGGER
 * Updated to allow 'RAIN' and accept ML metadata
 */
claimRouter.post('/',
  [
    body('policyId').isUUID().withMessage('Invalid Policy ID'),
    // Allowed RAIN in the validation list
    body('triggerType').isIn(['RAIN', 'HEAVY_RAINFALL','EXTREME_HEAT','FLOOD_ALERT','SEVERE_AQI','ORDER_COLLAPSE','CURFEW_BANDH']),
    body('triggerValue').isNumeric().withMessage('Trigger value is required'),
    // payoutAmount is now optional because the backend controller calculates it in Phase 3
    body('payoutAmount').optional().isNumeric(), 
    body('mlMetadata').optional().isObject(),
  ],
  validate,
  autoTriggerClaim 
);

/**
 * 2. INTERNAL SYSTEM TRIGGER
 */
claimRouter.post('/trigger',
  authorize('ADMIN'),
  [
    body('policyId').isUUID(),
    body('triggerType').isIn(['RAIN', 'HEAVY_RAINFALL','EXTREME_HEAT','FLOOD_ALERT','SEVERE_AQI','ORDER_COLLAPSE','CURFEW_BANDH']),
    body('triggerValue').isFloat(),
    body('threshold').isFloat(),
  ],
  validate,
  autoTriggerClaim,
);

// ... rest of the review route stays same
export default claimRouter;