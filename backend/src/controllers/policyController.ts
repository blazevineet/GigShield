import { Request, Response, NextFunction } from 'express';
import axios      from 'axios';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { logger }   from '../config/logger';

const TIER_BASE: Record<string, number>    = { basic: 29, standard: 49, pro: 79 };
const TIER_PAYOUT: Record<string, number>  = { basic: 500, standard: 1000, pro: 2000 };
const POLICY_DURATION_DAYS = 7;

/**
 * GET /api/v1/policies
 * Fetches policies. Admins see ALL, Workers see only THEIR OWN.
 */
export async function listPolicies(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Identify the user role from the token
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    
    const where: any = {};
    
    // 1. Global filter by status if provided in query params
    if (status) where.status = status;

    // 2. Role-Based Logic
    // If the user is a worker, we MUST filter by their specific profile ID
    if (userRole === 'WORKER') {
      const profile = await prisma.workerProfile.findUnique({ where: { userId } });
      if (!profile) return res.json({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      where.workerId = profile.id;
    } 
    // NOTE: If userRole is 'ADMIN' or 'INSURER', 'where.workerId' is NOT set.
    // This allows Prisma to fetch every single policy in the database.

    const [policies, total] = await prisma.$transaction([
      prisma.policy.findMany({
        where,
        include: { 
          worker: { include: { user: { select: { name: true, phone: true } } } }, 
          claims: { select: { id: true, status: true } } 
        },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.policy.count({ where }),
    ]);

    res.json({
      success: true,
      data: policies,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string) },
    });
  } catch (err) { 
    logger.error({ err }, 'Failed to list policies');
    next(err); 
  }
}

/**
 * POST /api/v1/policies
 */
export async function createPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { 
      tier, zone, platform, avg_hours, tenure_months, upiId, premium 
    } = req.body;
    
    const userId = (req as any).user.id;

    let profile = await prisma.workerProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.workerProfile.create({
        data: { 
          userId, 
          platform: platform || 'Unknown', 
          zone: zone || 'Default', 
          city: 'Chennai',
          avgDailyHours: Number(avg_hours) || 8, 
          tenureMonths: Number(tenure_months) || 0 
        },
      });
    }

    // Cancel existing policies for this specific worker only
    await prisma.policy.updateMany({
      where: { workerId: profile.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED' }
    });

    const finalPremium = Number(premium) || TIER_BASE[tier] || 61;
    const coverageHours = Number(avg_hours) || 8;

    await (prisma.user.update as any)({ 
      where: { id: userId }, 
      data: { 
        upiId: upiId || (req as any).user.upiId,
        hasProfile: true 
      } 
    }).catch(() => logger.warn("hasProfile field missing in DB"));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + POLICY_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const policy = await prisma.policy.create({
      data: {
        workerId:      profile.id,
        tier:          tier || 'standard',
        basePremium:   TIER_BASE[tier] || 49,
        finalPremium:  finalPremium,
        maxPayout:     TIER_PAYOUT[tier] || 1000,
        coverageHours: coverageHours,
        mlScore:       0.85,
        mlMultiplier:  1.1,
        status:        'ACTIVE',
        issuedAt:      now,
        expiresAt,
      },
    });

    res.status(201).json({ 
      success: true, 
      message: 'Shield Activated!', 
      data: policy 
    });

  } catch (err) { 
    next(err); 
  }
}

export async function getPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const policy = await prisma.policy.findUnique({
      where:   { id: req.params.id },
      include: { worker: true, claims: { include: { payout: true } } },
    });
    if (!policy) throw new AppError('Policy not found', 404);
    res.json({ success: true, data: policy });
  } catch (err) { next(err); }
}

export async function renewPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const old = await prisma.policy.findUnique({
      where:   { id: req.params.id },
      include: { worker: true },
    });
    if (!old) throw new AppError('Policy not found', 404);
    
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
    res.status(201).json({ success: true, data: renewed });
  } catch (err) { next(err); }
}

export async function cancelPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });
    if (!policy) throw new AppError('Policy not found', 404);
    await prisma.policy.update({ where: { id: policy.id }, data: { status: 'CANCELLED' } });
    res.json({ success: true, message: 'Policy cancelled' });
  } catch (err) { next(err); }
}