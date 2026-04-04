import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate';
import { prisma } from '../config/db';

export const payoutRouter = Router();

// Require login for all payout routes
payoutRouter.use(authenticate);

/**
 * GET /api/v1/payouts/
 * List all payouts (Admin/Insurer only)
 */
payoutRouter.get('/', authorize('ADMIN', 'INSURER'), async (_req, res, next) => {
  try {
    const payouts = await prisma.payout.findMany({
      include: { 
        claim: { 
          include: { 
            policy: { 
              include: { 
                worker: { 
                  include: { 
                    user: { select: { name: true, phone: true } } 
                  } 
                } 
              } 
            } 
          } 
        } 
      },
      orderBy: { initiatedAt: 'desc' },
      take: 50,
    });
    res.json({ data: payouts });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/payouts/:id
 * Get details for a specific payout
 */
payoutRouter.get('/:id', async (req, res, next) => {
  try {
    const payout = await prisma.payout.findUnique({
      where: { id: req.params.id },
      include: { claim: true },
    });
    
    if (!payout) {
      res.status(404).json({ error: 'Payout not found' });
      return;
    }
    
    res.json({ data: payout });
  } catch (err) {
    next(err);
  }
});