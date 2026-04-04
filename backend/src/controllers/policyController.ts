import { Request, Response, NextFunction } from 'express';
import axios      from 'axios';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { logger }   from '../config/logger';

const TIER_BASE: Record<string, number>    = { basic: 29, standard: 49, pro: 79 };
const TIER_PAYOUT: Record<string, number>  = { basic: 500, standard: 1000, pro: 2000 };
const POLICY_DURATION_DAYS = 7;

export async function listPolicies(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const isWorker = (req as any).user.role === 'WORKER';
    const where: any = {};
    if (status) where.status = status;

    if (isWorker) {
      const profile = await prisma.workerProfile.findUnique({ where: { userId: (req as any).user.id } });
      if (!profile) throw new AppError('Worker profile not found', 404);
      where.workerId = profile.id;
    }

    const [policies, total] = await prisma.$transaction([
      prisma.policy.findMany({
        where,
        include: { worker: { include: { user: { select: { name: true, phone: true } } } }, claims: { select: { id: true, status: true } } },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.policy.count({ where }),
    ]);

    res.json({
      data: policies,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string) },
    });
  } catch (err) { next(err); }
}

export async function getPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const policy = await prisma.policy.findUnique({
      where:   { id: req.params.id },
      include: { worker: true, claims: { include: { payout: true } } },
    });
    if (!policy) throw new AppError('Policy not found', 404);
    res.json({ data: policy });
  } catch (err) { next(err); }
}

export async function createPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { tier, zone, platform, avg_hours, tenure_months, upi_id } = req.body;
    const userId = (req as any).user.id;

    // Ensure worker profile exists
    let profile = await prisma.workerProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.workerProfile.create({
        data: { userId, platform, zone, avgDailyHours: avg_hours, tenureMonths: tenure_months },
      });
    }

    // Check no active policy already exists
    const existing = await prisma.policy.findFirst({
      where: { workerId: profile.id, status: 'ACTIVE' },
    });
    if (existing) throw new AppError('Worker already has an active policy', 409);

    // Get ML-computed premium
    let finalPremium = TIER_BASE[tier] || 49;
    let mlScore      = null;
    let mlMultiplier = null;
    let coverageHours = 8;

    try {
      const mlRes = await axios.post(`${process.env.ML_SERVICE_URL}/premium/predict`, {
        zone, tier, avg_hours, tenure_months, is_monsoon: true,
      }, { timeout: 5000 });
      finalPremium  = mlRes.data.final_premium;
      mlScore       = mlRes.data.risk_score;
      mlMultiplier  = mlRes.data.multiplier;
      coverageHours = mlRes.data.coverage_hours;
    } catch (mlErr) {
      logger.warn('ML service unavailable — using base premium');
    }

    // Update UPI
    await prisma.user.update({ where: { id: userId }, data: { upiId: upi_id } });

    const now       = new Date();
    const expiresAt = new Date(now.getTime() + POLICY_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const policy = await prisma.policy.create({
      data: {
        workerId:      profile.id,
        tier,
        basePremium:   TIER_BASE[tier] || 49,
        finalPremium,
        maxPayout:     TIER_PAYOUT[tier] || 1000,
        coverageHours,
        mlScore,
        mlMultiplier,
        status:        'ACTIVE',
        issuedAt:      now,
        expiresAt,
      },
    });

    logger.info({ policyId: policy.id, workerId: profile.id, tier, finalPremium }, 'Policy created');
    res.status(201).json({ data: policy });
  } catch (err) { next(err); }
}

export async function renewPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const old = await prisma.policy.findUnique({
      where:   { id: req.params.id },
      include: { worker: true },
    });
    if (!old)                    throw new AppError('Policy not found', 404);
    if (old.status === 'ACTIVE') throw new AppError('Policy is still active', 400);

    const now       = new Date();
    const expiresAt = new Date(now.getTime() + POLICY_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const renewed = await prisma.policy.create({
      data: {
        workerId:      old.workerId,
        tier:          old.tier,
        basePremium:   old.basePremium,
        finalPremium:  old.finalPremium,
        maxPayout:     old.maxPayout,
        coverageHours: old.coverageHours,
        renewedFromId: old.id,
        status:        'ACTIVE',
        issuedAt:      now,
        expiresAt,
      },
    });
    res.status(201).json({ data: renewed });
  } catch (err) { next(err); }
}

export async function cancelPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });
    if (!policy) throw new AppError('Policy not found', 404);
    await prisma.policy.update({ where: { id: policy.id }, data: { status: 'CANCELLED' } });
    res.json({ message: 'Policy cancelled' });
  } catch (err) { next(err); }
}
