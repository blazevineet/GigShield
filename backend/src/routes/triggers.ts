import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/db';

export const triggerRouter = Router();

triggerRouter.use(authenticate);

/**
 * PHASE 2: AUTOMATED TRIGGER SIMULATION
 */
triggerRouter.post('/simulate', async (req, res, next) => {
  try {
    const { zone, type, value } = req.body;

    // 1. Log the trigger event
    const trigger = await prisma.triggerEvent.create({
      data: { 
        zone, 
        triggerType: type, 
        value: parseFloat(value),
        threshold: 15.0,
        source: 'IOT_SENSOR_MOCK'
      }
    });

    // 2. Find active policies - Bypass strict type check for 'zone'
    const activePolicies = await prisma.policy.findMany({
      where: { 
        zone: zone, 
        status: 'ACTIVE' 
      } as any
    });

    // 3. Process Parametric Claims (Zero-Touch)
    const claims = await Promise.all(activePolicies.map(p => 
      prisma.claim.create({
        data: {
          policyId: p.id,
          ...({
            amount: 500, 
            status: 'PAID',
            description: `Phase 2 Auto-Payout: ${type} in ${zone}`
          } as any)
        }
      })
    ));

    res.json({ 
      success: true, 
      message: `Trigger processed. ${claims.length} claims paid.`,
      count: claims.length 
    });

  } catch (err) { 
    console.error("Simulation Error:", err);
    next(err); 
  }
});

triggerRouter.get('/live', async (req, res, next) => {
  try {
    const { zone } = req.query;
    const recent = await prisma.triggerEvent.findMany({
      where: (zone ? { zone: zone as string } : {}) as any,
      orderBy: { recordedAt: 'desc' },
      take: 30,
    });
    res.json({ data: recent });
  } catch (err) { next(err); }
});

triggerRouter.get('/history', async (req, res, next) => {
  try {
    const { zone, type, days = '7' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string) * 86400000);
    const events = await prisma.triggerEvent.findMany({
      where: {
        recordedAt: { gte: since },
        ...(zone ? { zone: zone as string } : {}),
        ...(type ? { triggerType: type as any } : {}),
      } as any,
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
    res.json({ data: events });
  } catch (err) { next(err); }
});