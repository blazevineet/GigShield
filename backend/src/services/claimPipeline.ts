/**
 * GigShield — Claim Pipeline Service
 * Decoupled from HTTP layer — called directly by trigger worker.
 */

import { prisma }      from '../config/db';
import { claimQueue }  from '../config/queues';
import { computeBCS }  from './bcsService';
import { logger }      from '../config/logger';

interface TriggerClaimInput {
  policyId:     string;
  triggerType:  string;
  triggerValue: number;
  threshold:    number;
}

export async function processTriggerClaim(input: TriggerClaimInput) {
  const { policyId, triggerType, triggerValue, threshold } = input;

  // Guard: skip if policy no longer active
  const policy = await prisma.policy.findUnique({
    where:   { id: policyId },
    include: { worker: { include: { user: true } } },
  });
  if (!policy || policy.status !== 'ACTIVE') return;

  // Dedup: skip if claim fired for this trigger type in last 60 minutes
  const recent = await prisma.claim.findFirst({
    where: {
      policyId,
      triggerType: triggerType as any,
      firedAt:     { gte: new Date(Date.now() - 60 * 60 * 1000) },
      status:      { notIn: ['REJECTED'] },
    },
  });
  if (recent) return;

  // Compute payout amount
  const disruptedHours = estimateDisruptedHours(triggerType, triggerValue, threshold);
  const dailyEarnings  = 900;
  const rawPayout      = (disruptedHours / policy.coverageHours) * dailyEarnings * 0.80;
  const payoutAmount   = Math.min(Math.round(rawPayout), policy.maxPayout);

  // BCS fraud scoring
  const { score, breakdown } = await computeBCS({
    workerId:    policy.workerId,
    zone:        policy.worker.zone,
    triggerType,
    triggerValue,
    firedAt:     new Date(),
  });

  const status =
    score >= 0.70 ? 'AUTO_APPROVED' :
    score >= 0.50 ? 'SOFT_HOLD'     :
                    'HARD_HOLD';

  const claim = await prisma.claim.create({
    data: {
      policyId,
      triggerType:   triggerType as any,
      triggerValue,
      threshold,
      bcsScore:      score,
      bcsBreakdown:  breakdown as any,
      payoutAmount,
      status:        status as any,
      autoTriggered: true,
    },
  });

  logger.info({ claimId: claim.id, policyId, triggerType, score, status, payoutAmount }, 'Claim created');

  // Enqueue payout for auto-approved
  if (status === 'AUTO_APPROVED' && policy.worker.user.upiId) {
    await claimQueue.add('process-payout', {
      claimId: claim.id,
      upiId:   policy.worker.user.upiId,
      amount:  payoutAmount,
    });
  }

  return claim;
}

function estimateDisruptedHours(type: string, value: number, threshold: number): number {
  const severity = (value - threshold) / threshold;
  const base: Record<string, number> = {
    HEAVY_RAINFALL: 3, EXTREME_HEAT: 4, FLOOD_ALERT: 6,
    SEVERE_AQI: 3, ORDER_COLLAPSE: 2, CURFEW_BANDH: 8,
  };
  return Math.min((base[type] || 3) * (1 + severity * 0.5), 10);
}
