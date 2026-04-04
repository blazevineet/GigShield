// ─── workers.ts ───────────────────────────────────────────
import { Router } from 'express';
import { body }   from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';

export const workerRouter = Router();
workerRouter.use(authenticate);

// GET /workers/profile
workerRouter.get('/profile', async (req: any, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where:   { userId: req.user.id },
      include: { user: { select: { name: true, phone: true, upiId: true } } },
    });
    if (!profile) throw new AppError('Profile not found', 404);
    res.json({ data: profile });
  } catch (err) { next(err); }
});

// POST /workers/profile
workerRouter.post('/profile',
  [
    body('platform').notEmpty(),
    body('zone').notEmpty(),
    body('avgDailyHours').isFloat({ min: 1, max: 16 }),
    body('tenureMonths').isInt({ min: 0 }),
    body('name').notEmpty().isLength({ min: 2, max: 100 }),
    body('upiId').matches(/^[\w.\-]+@[\w]+$/),
  ],
  validate,
  async (req: any, res: any, next: any) => {
    try {
      const { platform, zone, avgDailyHours, tenureMonths, name, upiId } = req.body;
      await prisma.user.update({
        where: { id: req.user.id },
        data:  { name, upiId },
      });
      const profile = await prisma.workerProfile.upsert({
        where:  { userId: req.user.id },
        create: { userId: req.user.id, platform, zone, avgDailyHours, tenureMonths },
        update: { platform, zone, avgDailyHours, tenureMonths },
      });
      res.status(201).json({ data: profile });
    } catch (err) { next(err); }
  },
);

// POST /workers/gps  — GPS ping
workerRouter.post('/gps',
  [body('lat').isFloat(), body('lon').isFloat()],
  validate,
  async (req: any, res: any, next: any) => {
    try {
      const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
      if (!profile) throw new AppError('Profile not found', 404);
      await prisma.gpsPing.create({
        data: {
          workerId:  profile.id,
          lat:       req.body.lat,
          lon:       req.body.lon,
          accuracy:  req.body.accuracy,
          speed:     req.body.speed,
        },
      });
      res.status(201).json({ message: 'GPS ping recorded' });
    } catch (err) { next(err); }
  },
);
