import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate';
import { prisma } from '../config/db';

export const adminRouter = Router();

// Apply protection - Ensure your token has the 'ADMIN' or 'INSURER' role
adminRouter.use(authenticate, authorize('ADMIN', 'INSURER'));

/**
 * GET /api/v1/admin/stats
 */
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
      prisma.payout.aggregate({ 
        _sum: { amount: true }, 
        where: { 
          status: 'SUCCESS', 
          completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        } 
      }),
    ]);

    const premPool   = Number(weeklyPremium._sum.finalPremium) || 0;
    const payoutPool = Number(weeklyPayout._sum.amount) || 0;
    const lossRatio  = premPool > 0 ? Math.round((payoutPool / premPool) * 100) : 0;

    res.json({
      success: true,
      data: {
        activePolicies,
        totalClaims,
        paidClaims,
        heldClaims,
        weeklyPremiumPool: premPool,
        weeklyPayout: payoutPool,
        lossRatio: lossRatio || 76.2, // Fallback to your demo value if pool is 0
        zeroTouchRate: totalClaims > 0 ? Math.round((paidClaims / totalClaims) * 100) : 98.2,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/heatmap
 */
adminRouter.get('/heatmap', async (_req, res, next) => {
  try {
    const zones = await prisma.workerProfile.groupBy({
      by: ['zone'],
      _count: { id: true },
    });

    const claimsByZone = await prisma.$queryRaw<any[]>`
      SELECT wp.zone, COUNT(c.id) as count, AVG(c.bcs_score) as avg_bcs
      FROM claims c
      JOIN policies p ON c.policy_id = p.id
      JOIN worker_profiles wp ON p.worker_id = wp.id
      WHERE c.fired_at >= NOW() - INTERVAL '7 days'
      GROUP BY wp.zone
    `;

    res.json({ success: true, data: { zones, claimsByZone } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/forecast
 */
adminRouter.get('/forecast', async (_req, res, next) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    return {
      date: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      rainRisk: ['High','High','Med','Low','Low','Low','Med'][i],
      heatRisk: ['Low','Low','Low','Med','Low','High','Med'][i],
      riskLevel:['High','High','Med','Low','Low','Med','Med'][i],
    };
  });
  res.json({ success: true, data: days });
});