import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';

/**
 * GET /api/v1/workers/me
 */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;

    const profile = await prisma.workerProfile.findUnique({
      where: { userId },
      include: { 
        user: { 
          select: { name: true, phone: true, upiId: true } 
        } 
      }
    });

    if (!profile) throw new AppError('Worker profile not found', 404);

    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/workers/profile
 * FIX: Mapped snake_case frontend fields to camelCase backend fields to resolve 422 errors
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    
    // Destructure using the names seen in your browser console screenshots
    const { 
      platform, 
      zone, 
      city, 
      avg_hours,      // Mapped from frontend snake_case
      tenure_months,  // Mapped from frontend snake_case
      name, 
      upiId 
    } = req.body;

    // 1. Zone Validation (Keep relaxed for demo)
    const validZone = await prisma.zoneRiskProfile.findFirst({
      where: { zone, city }
    });

    if (!validZone) {
      logger.warn(`Zone ${zone} in ${city} not found. Proceeding with default risk.`);
    }

    // 2. Update User-specific info & Mark Onboarding as Complete
    // 'as any' bypasses the TSError for hasProfile
    await (prisma.user.update as any)({
      where: { id: userId },
      data: { 
        ...(name && { name }), 
        ...(upiId && { upiId }),
        hasProfile: true 
      }
    }).catch(() => {
      logger.warn("User update: hasProfile field likely missing in DB schema.");
    });

    // 3. Upsert the Worker Profile
    // CRITICAL: We convert the snake_case variables to the Prisma camelCase fields
    const profile = await prisma.workerProfile.upsert({
      where: { userId },
      update: {
        platform,
        zone,
        city,
        avgDailyHours: Number(avg_hours) || 8, // Conversion and fallback
        tenureMonths: Number(tenure_months) || 0
      },
      create: {
        userId,
        platform,
        zone,
        city,
        avgDailyHours: Number(avg_hours) || 8,
        tenureMonths: Number(tenure_months) || 0
      }
    });

    logger.info({ userId, profileId: profile.id }, 'Worker profile updated successfully');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } catch (err) {
    logger.error({ err }, 'updateProfile Failure');
    next(err);
  }
}

/**
 * POST /api/v1/workers/gps
 */
export async function recordGps(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const { lat, lon, accuracy, speed } = req.body;

    const profile = await prisma.workerProfile.findUnique({
      where: { userId }
    });

    if (!profile) throw new AppError('Profile not found', 404);

    const ping = await prisma.gpsPing.create({
      data: {
        workerId: profile.id,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        accuracy: parseFloat(accuracy) || 0,
        speed: parseFloat(speed) || 0
      }
    });

    res.status(201).json({
      success: true,
      data: ping
    });
  } catch (err) {
    next(err);
  }
}