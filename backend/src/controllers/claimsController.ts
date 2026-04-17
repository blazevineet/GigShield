import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { processTriggerClaim } from '../services/claimPipeline';

// ────────────────────────────────────────────────────────
// GET /claims - List with Role-based filtering
// ────────────────────────────────────────────────────────
export async function listClaims(req: Request, res: Response, next: NextFunction) {
  try {
    const { policyId, status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (policyId) where.policyId = policyId;
    if (status) where.status = status;

    // RBAC: Workers only see their own claims
    if ((req as any).user.role === 'WORKER') {
      const profile = await prisma.workerProfile.findUnique({
        where: { userId: (req as any).user.id },
      });

      // FIX: If no profile exists yet, return empty data gracefully 
      // instead of throwing an error or leaking data.
      if (!profile) {
        return res.json({
          data: [],
          meta: { total: 0, page: 1, limit: parseInt(limit as string), pages: 0 }
        });
      }

      // Filter claims by the worker's specific profile ID
      where.policy = { workerId: profile.id };
    }

    const [claims, total] = await prisma.$transaction([
      prisma.claim.findMany({
        where,
        include: { 
          policy: { include: { worker: { include: { user: true } } } }, 
          payout: true 
        },
        orderBy: { firedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.claim.count({ where }),
    ]);

    res.json({
      data: claims,
      meta: { 
        total, 
        page: parseInt(page as string), 
        limit: parseInt(limit as string), 
        pages: Math.ceil(total / parseInt(limit as string)) 
      },
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────
// GET /claims/:id
// ────────────────────────────────────────────────────────
export async function getClaim(req: Request, res: Response, next: NextFunction) {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: { policy: { include: { worker: true } }, payout: true },
    });
    
    if (!claim) throw new AppError('Claim not found', 404);
    
    // Safety check: Don't let workers peek at other workers' claims via URL guessing
    if ((req as any).user.role === 'WORKER' && claim.policy.worker.userId !== (req as any).user.id) {
        throw new AppError('Unauthorized access to claim', 403);
    }

    res.json({ data: claim });
  } catch (err) {
    next(err);
  }
}

export async function autoTriggerClaim(req: Request, res: Response, next: NextFunction) {
  try {
    const { policyId, triggerType, triggerValue, threshold, mlMetadata } = req.body;

    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: { worker: { include: { user: true } } }
    });

    if (!policy) throw new AppError('Policy not found', 404);
    
    // Safety: Ensure user owns this policy before they can simulate a claim
    if ((req as any).user.role === 'WORKER' && policy.worker.userId !== (req as any).user.id) {
        throw new AppError('You can only simulate claims for your own policy', 403);
    }

    if (policy.status !== 'ACTIVE') throw new AppError('Policy is not active', 400);

    const claim = await processTriggerClaim({
      policyId,
      triggerType,
      triggerValue: Number(triggerValue),
      threshold: Number(threshold),
      mlMetadata 
    });

    if (!claim) {
      return res.status(200).json({ 
        success: true, 
        message: 'Claim request received but suppressed (likely duplicate or low confidence)' 
      });
    }

    res.status(201).json({ success: true, data: claim });
  } catch (err) {
    logger.error({ err }, 'autoTriggerClaim Critical Failure');
    next(err);
  }
}

export async function reviewClaim(req: Request, res: Response, next: NextFunction) {
  try {
    const { decision, adjusterNotes } = req.body;
    
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      throw new AppError('Invalid decision', 400);
    }

    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: { policy: { include: { worker: { include: { user: true } } } } },
    });

    if (!claim) throw new AppError('Claim not found', 404);
    
    const newStatus = decision === 'APPROVED' ? 'PAID' : 'REJECTED';
    
    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: { status: newStatus as any, adjusterNotes, resolvedAt: new Date() },
    });

    if (newStatus === 'PAID') {
      const { initiatePayout } = await import('../services/payoutService');
      await initiatePayout({
        claimId: claim.id,
        upiId: claim.policy.worker.user.upiId || 'test@upi',
        amount: claim.payoutAmount,
      });
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}