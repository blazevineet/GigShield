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
      if (!profile) throw new AppError('Worker profile not found', 404);
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
    
    if ((req as any).user.role === 'WORKER' && claim.policy.worker.userId !== (req as any).user.id) {
        throw new AppError('Unauthorized access to claim', 403);
    }

    res.json({ data: claim });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /claims (The Phase 3 Intelligence Simulation)
 * LEVELLED UP: This now calls the unified pipeline to ensure ML & Payouts 
 * are triggered exactly like the automated worker.
 */
export async function autoTriggerClaim(req: Request, res: Response, next: NextFunction) {
  try {
    const { policyId, triggerType, triggerValue, threshold, mlMetadata } = req.body;

    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: { worker: { include: { user: true } } }
    });

    if (!policy) throw new AppError('Policy not found', 404);
    if (policy.status !== 'ACTIVE') throw new AppError('Policy is not active', 400);

    /**
     * PHASE 3 INTEGRATION: 
     * Instead of manual calculation here, we hand off to the Pipeline.
     * This ensures 'AUTO_APPROVED' and 'MANUAL_REVIEW' statuses are 
     * determined by the ML results (mlMetadata).
     */
    const claim = await processTriggerClaim({
      policyId,
      triggerType,
      triggerValue: Number(triggerValue),
      threshold: Number(threshold),
      mlMetadata // This allows the frontend to simulate "High Confidence" or "Anomaly"
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

// ────────────────────────────────────────────────────────
// PATCH /claims/:id/review (Admin Decision)
// ────────────────────────────────────────────────────────
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
    
    // Status sync with Phase 3 Schema (MANUAL_REVIEW -> PAID/REJECTED)
    const newStatus = decision === 'APPROVED' ? 'PAID' : 'REJECTED';
    
    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: { status: newStatus as any, adjusterNotes, resolvedAt: new Date() },
    });

    // If manually approved, trigger the immediate payout service
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