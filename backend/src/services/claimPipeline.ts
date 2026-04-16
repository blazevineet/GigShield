/**
 * GigShield — Phase 3 Intelligent Claim Pipeline
 * Powered by ML Risk Scoring & Automated Payouts.
 */

import { prisma }      from '../config/db';
import { logger }      from '../config/logger';
import { initiatePayout } from './payoutService'; 

// Phase 3 Interface: Now explicitly expects ML Metadata
export interface TriggerClaimInput {
  policyId:     string;
  triggerType:  string;
  triggerValue: number;
  threshold:    number;
  mlMetadata?: {
    severity: number;
    risk_level: string;
    confidence: number;
    is_anomaly: boolean;
    alerts: string[];
  };
}

export async function processTriggerClaim(input: TriggerClaimInput) {
  const { policyId, triggerType, triggerValue, threshold, mlMetadata } = input;

  // 1. Guard: Check policy status
  const policy = await prisma.policy.findUnique({
    where:   { id: policyId },
    include: { worker: { include: { user: true } } },
  });
  if (!policy || policy.status !== 'ACTIVE') return;

  // 2. Dedup: Prevent double-firing within 60 minutes
  const recent = await prisma.claim.findFirst({
    where: {
      policyId,
      triggerType: triggerType as any,
      firedAt:     { gte: new Date(Date.now() - 60 * 60 * 1000) },
      status:      { notIn: ['REJECTED'] },
    },
  });
  if (recent) return;

  // 3. Compute dynamic payout amount based on ML Severity
  const mlSeverity = mlMetadata?.severity || 1.0;
  const rawPayout = estimateDisruptedPayout(triggerType, triggerValue, threshold, mlSeverity);
  const payoutAmount = Math.min(Math.round(rawPayout), policy.maxPayout);

  // 4. LEVEL UP Logic: Use AI Confidence for Status
  let status: any = 'PENDING';
  
  if (mlMetadata?.is_anomaly) {
    status = 'MANUAL_REVIEW'; // Safety first for fraud
  } else if (mlMetadata?.confidence && mlMetadata.confidence >= 0.90) {
    status = 'AUTO_APPROVED'; // High trust level
  } else if (mlMetadata?.risk_level === 'LOW') {
    status = 'SOFT_HOLD';
  }

  // 5. Create Claim with New Phase 3 Database Fields
  const claim = await prisma.claim.create({
    data: {
      policyId,
      triggerType:   triggerType as any,
      triggerValue,
      threshold,
      payoutAmount,
      status:        status as any,
      severity:      mlSeverity,
      aiConfidence:  mlMetadata?.confidence || 0,
      isAnomaly:     mlMetadata?.is_anomaly || false,
      alerts:        mlMetadata?.alerts || [],
      autoTriggered: true,
      notes:         mlMetadata?.is_anomaly ? `Anomaly Detected: ${mlMetadata.alerts.join(', ')}` : 'AI Verified',
    },
  });

  logger.info({ claimId: claim.id, confidence: mlMetadata?.confidence, status }, 'Phase 3 Claim Processed');

  // 6. INSTANT PAYOUT: Execute if Auto-Approved and Wallet Configured
  if (status === 'AUTO_APPROVED' && policy.worker.user.upiId) {
    try {
      logger.info({ claimId: claim.id }, '🚀 High AI Confidence: Triggering Instant Payout via Razorpay');
      
      const payoutRes = await initiatePayout({
        claimId: claim.id,
        upiId:   policy.worker.user.upiId,
        amount:  payoutAmount,
      });

      if (payoutRes.success) {
        await prisma.claim.update({
          where: { id: claim.id },
          data: { status: 'PAID', settledAt: new Date() }
        });
      }
    } catch (err) {
      logger.error({ claimId: claim.id, err }, 'Instant payout failed - retained for manual retry');
    }
  }

  return claim;
}

/**
 * Enhanced disruption estimation using ML Severity factor
 */
function estimateDisruptedPayout(type: string, value: number, threshold: number, severityFactor: number): number {
  const baseRate = 150; // INR per hour of estimated loss
  const baseHours: Record<string, number> = {
    HEAVY_RAINFALL: 3, EXTREME_HEAT: 4, FLOOD_ALERT: 6,
    SEVERE_AQI: 3, ORDER_COLLAPSE: 2, CURFEW_BANDH: 8,
  };
  
  // Severity factor from Python (0.5 to 2.0) scales the disruption time
  const hours = (baseHours[type] || 3) * severityFactor;
  return hours * baseRate;
}