import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';

/**
 * GET /workers/profile
 * Get the current worker's profile details
 */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;

    const profile = await prisma.workerProfile.findUnique({
      where: { userId },
      include: { user: { select: { name: true, phone: true, upiId: true } } }
    });

    if (!profile) throw new AppError('Worker profile not found', 404);

    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /workers/profile
 * Create or update worker onboarding data (City, Zone, Platform)
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const { platform, zone, city, avgDailyHours, tenureMonths } = req.body;

    // Phase 3 Requirement: Validate that the zone exists in our Risk Seed data
    const validZone = await prisma.zoneRiskProfile.findFirst({
      where: { zone, city }
    });

    if (!validZone) {
      throw new AppError(`We do not currently support parametric triggers in ${zone}, ${city}`, 400);
    }

    const profile = await prisma.workerProfile.upsert({
      where: { userId },
      update: {
        platform,
        zone,
        city,
        avgDailyHours: avgDailyHours || 8,
        tenureMonths: tenureMonths || 0
      },
      create: {
        userId,
        platform,
        zone,
        city,
        avgDailyHours: avgDailyHours || 8,
        tenureMonths: tenureMonths || 0
      }
    });

    logger.info({ userId, zone, platform }, 'Worker profile updated');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } catch (err) {
    next(err);
  }
}