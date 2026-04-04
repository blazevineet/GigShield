// ─── admin.ts ─────────────────────────────────────────────
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate';
import { prisma }   from '../config/db';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize('ADMIN', 'INSURER'));

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [
      activePolicies,
      totalClaims,
      paidClaims,
      heldClaims,
      weeklyPremium,
      weeklyPayout,
    ] = await prisma.$transaction([
      prisma.policy.count({ where: { status: 'ACTIVE' } }),
      prisma.claim.count(),
      prisma.claim.count({ where: { status: 'PAID' } }),
      prisma.claim.count({ where: { status: { in: ['SOFT_HOLD', 'HARD_HOLD'] } } }),
      prisma.policy.aggregate({ _sum: { finalPremium: true }, where: { status: 'ACTIVE' } }),
      prisma.payout.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS', completedAt: { gte: new Date(Date.now() - 7*24*60*60*1000) } } }),
    ]);

    const premPool   = weeklyPremium._sum.finalPremium || 0;
    const payoutPool = weeklyPayout._sum.amount || 0;
    const lossRatio  = premPool > 0 ? Math.round((payoutPool / premPool) * 100) : 0;

    res.json({
      data: {
        activePolicies,
        totalClaims,
        paidClaims,
        heldClaims,
        weeklyPremiumPool: premPool,
        weeklyPayout:      payoutPool,
        lossRatio,
        zeroTouchRate:     totalClaims > 0
          ? Math.round((paidClaims / totalClaims) * 100) : 0,
      },
    });
  } catch (err) { next(err); }
});

adminRouter.get('/heatmap', async (_req, res, next) => {
  try {
    const zones = await prisma.workerProfile.groupBy({
      by:     ['zone'],
      _count: { id: true },
    });

    const claimsByZone = await prisma.$queryRaw<{ zone: string; count: bigint; avg_bcs: number }[]>`
      SELECT wp.zone, COUNT(c.id) as count, AVG(c.bcs_score) as avg_bcs
      FROM claims c
      JOIN policies p  ON c.policy_id  = p.id
      JOIN worker_profiles wp ON p.worker_id = wp.id
      WHERE c.fired_at >= NOW() - INTERVAL '7 days'
      GROUP BY wp.zone
    `;

    res.json({ data: { zones, claimsByZone } });
  } catch (err) { next(err); }
});

adminRouter.get('/forecast', async (_req, res, next) => {
  // In production: call ML service for Prophet forecast
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    return {
      date:     d.toISOString().split('T')[0],
      day:      d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      rainRisk: ['High','High','Med','Low','Low','Low','Med'][i],
      heatRisk: ['Low','Low','Low','Med','Low','High','Med'][i],
      riskLevel:['High','High','Med','Low','Low','Med','Med'][i],
    };
  });
  res.json({ data: days });
});


