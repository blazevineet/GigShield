import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';

export const workerRouter = Router();

// Protect all routes in this router
workerRouter.use(authenticate);

/**
 * GET /api/v1/workers/profile (or /me)
 * Fetches the worker's profile, including User table data (UPI, Name)
 */
workerRouter.get('/profile', async (req: any, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id },
      include: { 
        user: { 
          select: { name: true, phone: true, upiId: true } 
        } 
      },
    });
    
    if (!profile) return next(new AppError('Profile not found', 404));
    
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/workers/profile
 * Updates User info and Upserts the Worker Profile
 */
workerRouter.post(
  '/profile',
  [
    body('platform').notEmpty().withMessage('Platform is required'),
    body('zone').notEmpty().withMessage('Zone is required'),
    body('avgDailyHours').isFloat({ min: 1, max: 16 }),
    body('tenureMonths').optional().isInt({ min: 0 }),
    body('name').notEmpty().isLength({ min: 2 }).withMessage('Name is too short'),
    body('upiId').matches(/^[\w.\-]+@[\w]+$/).withMessage('Invalid UPI ID format'),
  ],
  validate,
  async (req: any, res: any, next: any) => {
    try {
      const { platform, zone, avgDailyHours, tenureMonths, name, upiId } = req.body;

      // 1. Sync User table (Name and UPI are shared across the app)
      await prisma.user.update({
        where: { id: req.user.id },
        data: { name, upiId },
      });

      // 2. Upsert Worker specific profile
      const profile = await prisma.workerProfile.upsert({
        where: { userId: req.user.id },
        create: { 
          userId: req.user.id, 
          platform, 
          zone, 
          avgDailyHours: parseFloat(avgDailyHours), 
          tenureMonths: tenureMonths || 0 
        },
        update: { 
          platform, 
          zone, 
          avgDailyHours: parseFloat(avgDailyHours), 
          tenureMonths 
        },
      });

      res.status(201).json({ data: profile });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/workers/gps
 * Critical for the Admin Heatmap to show live movement
 */
workerRouter.post(
  '/gps',
  [
    body('lat').isFloat(), 
    body('lon').isFloat()
  ],
  validate,
  async (req: any, res: any, next: any) => {
    try {
      const profile = await prisma.workerProfile.findUnique({ 
        where: { userId: req.user.id } 
      });
      
      if (!profile) return next(new AppError('Profile not found', 404));

      await prisma.gpsPing.create({
        data: {
          workerId: profile.id,
          lat: req.body.lat,
          lon: req.body.lon,
          accuracy: req.body.accuracy || 10,
          speed: req.body.speed || 0,
        },
      });

      res.status(201).json({ message: 'GPS ping recorded' });
    } catch (err) {
      next(err);
    }
  }
);