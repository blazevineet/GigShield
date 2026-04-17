import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';

/**
 * GET /workers/me (or /profile)
 * Get the current worker's profile details
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
 * POST /workers/profile
 * Create or update worker onboarding data
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const { platform, zone, city, avgDailyHours, tenureMonths, name, upiId } = req.body;

    // 1. Validate supported zones
    const validZone = await prisma.zoneRiskProfile.findFirst({
      where: { zone, city }
    });

    if (!validZone) {
      throw new AppError(`We do not currently support parametric triggers in ${zone}, ${city}`, 400);
    }

    // 2. Update User-specific info if provided (Name/UPI)
    if (name || upiId) {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          ...(name && { name }), 
          ...(upiId && { upiId }) 
        }
      });
    }

    // 3. Upsert the Worker Profile
    const profile = await prisma.workerProfile.upsert({
      where: { userId },
      update: {
        platform,
        zone,
        city,
        avgDailyHours: Number(avgDailyHours) || 8,
        tenureMonths: Number(tenureMonths) || 0
      },
      create: {
        userId,
        platform,
        zone,
        city,
        avgDailyHours: Number(avgDailyHours) || 8,
        tenureMonths: Number(tenureMonths) || 0
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

/**
 * POST /workers/gps
 * Record GPS pings to feed the Geographical Risk Heatmap
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