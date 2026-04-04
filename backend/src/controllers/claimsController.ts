import { Request, Response, NextFunction } from 'express';
import { prisma }       from '../config/db';
import { claimQueue }   from '../config/queues';
import { AppError }     from '../utils/AppError';
import { logger }       from '../config/logger';
import { computeBCS }   from '../services/bcsService';
import { initiatePayout } from '../services/payoutService';

// ────────────────────────────────────────────────────────
// GET /claims?policyId=&status=&page=&limit=
// ────────────────────────────────────────────────────────
export async function listClaims(req: Request, res: Response, next: NextFunction) {
  try {
    const { policyId, status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (policyId) where.policyId   = policyId;
    if (status)   where.status     = status;

    // Workers can only see their own claims
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
        include: { policy: { include: { worker: { include: { user: true } } } }, payout: true },
        orderBy: { firedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.claim.count({ where }),
    ]);

    res.json({
      data: claims,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), pages: Math.ceil(total / parseInt(limit as string)) },
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
      where:   { id: req.params.id },
      include: { policy: { include: { worker: true } }, payout: true },
    });
    if (!claim) throw new AppError('Claim not found', 404);
    res.json({ data: claim });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────
// POST /claims/trigger  (internal — called by trigger worker)
// Auto-initiate claim when parametric threshold is breached
// ────────────────────────────────────────────────────────
export async function autoTriggerClaim(req: Request, res: Response, next: NextFunction) {
  try {
    const { policyId, triggerType, triggerValue, threshold, source } = req.body;

    const policy = await prisma.policy.findUnique({
      where:   { id: policyId },
      include: { worker: { include: { user: true } } },
    });
    if (!policy)              throw new AppError('Policy not found', 404);
    if (policy.status !== 'ACTIVE') throw new AppError('Policy is not active', 400);

    // Check no duplicate claim in last 1 hour for same trigger type
    const recent = await prisma.claim.findFirst({
      where: {
        policyId,
        triggerType,
        firedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        status:  { notIn: ['REJECTED'] },
      },
    });
    if (recent) {
      logger.warn({ policyId, triggerType }, 'Duplicate claim suppressed');
      return res.json({ message: 'Duplicate claim suppressed', claimId: recent.id });
    }

    // Compute payout
    // formula: (disrupted hours / expected hours) × daily avg earnings × 80%
    const disruptedHours  = estimateDisruptedHours(triggerType, triggerValue, threshold);
    const dailyEarnings   = 900; // TODO: fetch from platform API
    const coveragePct     = 0.80;
    const rawPayout       = (disruptedHours / policy.coverageHours) * dailyEarnings * coveragePct;
    const payoutAmount    = Math.min(Math.round(rawPayout), policy.maxPayout);

    // Compute BCS score
    const { score, breakdown } = await computeBCS({
      workerId:    policy.worker.id,
      zone:        policy.worker.zone,
      triggerType,
      triggerValue,
      firedAt:     new Date(),
    });

    // Determine claim status
    let status: string;
    if      (score >= 0.70) status = 'AUTO_APPROVED';
    else if (score >= 0.50) status = 'SOFT_HOLD';
    else                    status = 'HARD_HOLD';

    const claim = await prisma.claim.create({
      data: {
        policyId,
        triggerType,
        triggerValue,
        threshold,
        bcsScore:    score,
        bcsBreakdown: breakdown,
        payoutAmount,
        status:       status as any,
        autoTriggered: true,
      },
    });

    logger.info({ claimId: claim.id, status, score, payoutAmount }, 'Claim created');

    // Queue payout for auto-approved claims
    if (status === 'AUTO_APPROVED') {
      await claimQueue.add('process-payout', {
        claimId:  claim.id,
        upiId:    policy.worker.user.upiId,
        amount:   payoutAmount,
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    }

    res.status(201).json({ data: claim });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────
// PATCH /claims/:id/review  (Admin only)
// ────────────────────────────────────────────────────────
export async function reviewClaim(req: Request, res: Response, next: NextFunction) {
  try {
    const { decision, adjusterNotes } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      throw new AppError('Decision must be APPROVED or REJECTED', 400);
    }

    const claim = await prisma.claim.findUnique({
      where:   { id: req.params.id },
      include: { policy: { include: { worker: { include: { user: true } } } } },
    });
    if (!claim) throw new AppError('Claim not found', 404);
    if (!['SOFT_HOLD', 'HARD_HOLD'].includes(claim.status)) {
      throw new AppError('Only held claims can be reviewed', 400);
    }

    const newStatus = decision === 'APPROVED' ? 'AUTO_APPROVED' : 'REJECTED';
    const updated   = await prisma.claim.update({
      where: { id: claim.id },
      data:  { status: newStatus as any, adjusterNotes, resolvedAt: new Date() },
    });

    if (newStatus === 'AUTO_APPROVED') {
      await claimQueue.add('process-payout', {
        claimId: claim.id,
        upiId:   claim.policy.worker.user.upiId,
        amount:  claim.payoutAmount,
      });
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

// ── Helpers ──────────────────────────────────────────────
function estimateDisruptedHours(triggerType: string, value: number, threshold: number): number {
  const severity = (value - threshold) / threshold;
  const base: Record<string, number> = {
    HEAVY_RAINFALL: 3,
    EXTREME_HEAT:   4,
    FLOOD_ALERT:    6,
    SEVERE_AQI:     3,
    ORDER_COLLAPSE: 2,
    CURFEW_BANDH:   8,
  };
  const baseHours = base[triggerType] || 3;
  return Math.min(baseHours * (1 + severity * 0.5), 10);
}
