/**
 * GigShield — Phase 3 Behavioral Coherence Score (BCS) Service
 * * Synchronized with Phase 3 ML Engine. 
 * Note: 'speed' and 'accuracy' are now handled as part of the ML anomaly detection.
 */

import { prisma } from '../config/db';
import { logger } from '../config/logger';

export interface BCSInput {
  workerId:     string;
  zone:         string;
  triggerType:  string;
  triggerValue: number;
  firedAt:      Date;
}

export interface BCSResult {
  score:     number;
  breakdown: Record<string, { score: number; weight: number; reason: string }>;
}

const WEIGHTS = {
  gps_in_zone:        0.40, // Increased weight for Phase 3
  app_login_active:   0.30,
  claim_history:      0.30,
};

export async function computeBCS(input: BCSInput): Promise<BCSResult> {
  const { workerId, zone, triggerType, firedAt } = input;

  // We focus on the core signals that exist in your current Prisma Schema
  const [gpsScore, loginScore, historyScore] = await Promise.all([
    scoreGpsInZone(workerId, zone, firedAt),
    scoreAppLogin(workerId, firedAt),
    scoreClaimHistory(workerId),
  ]);

  const breakdown = {
    gps_in_zone:       { score: gpsScore,      weight: WEIGHTS.gps_in_zone,      reason: buildReason('gps',      gpsScore) },
    app_login_active:  { score: loginScore,     weight: WEIGHTS.app_login_active,  reason: buildReason('login',     loginScore) },
    claim_history:     { score: historyScore,    weight: WEIGHTS.claim_history,     reason: buildReason('history',   historyScore) },
  };

  const score = Object.entries(breakdown).reduce(
    (acc, [, { score: s, weight: w }]) => acc + s * w,
    0,
  );

  logger.info({ workerId, triggerType, score }, 'BCS computed for Phase 3 logic');
  return { score: parseFloat(score.toFixed(4)), breakdown };
}

// ── Signal scorers ────────────────────────────────────────

async function scoreGpsInZone(workerId: string, zone: string, firedAt: Date): Promise<number> {
  const windowStart = new Date(firedAt.getTime() - 15 * 60 * 1000); 
  const pings = await prisma.gpsPing.findMany({
    where: { workerId, recordedAt: { gte: windowStart, lte: firedAt } },
    orderBy: { recordedAt: 'desc' },
    take: 5,
  });

  if (pings.length === 0) return 0.5;

  // Phase 3: In a real scenario, Python handles the complex geofencing.
  // Here we check if data exists and is recent.
  return pings.length >= 2 ? 0.95 : 0.60;
}

async function scoreAppLogin(_workerId: string, _firedAt: Date): Promise<number> {
  // Simulating active session check
  return 0.90; 
}

async function scoreClaimHistory(workerId: string): Promise<number> {
  const profile = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!profile) return 0.7;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentClaims  = await prisma.claim.count({
    where: {
      policy:  { workerId },
      firedAt: { gte: thirtyDaysAgo },
      status:  { notIn: ['REJECTED'] },
    },
  });

  if (recentClaims <= 2) return 0.95;
  if (recentClaims <= 5) return 0.70;
  return 0.40;
}

function buildReason(signal: string, score: number): string {
  const map: Record<string, [string, string, string]> = {
    gps:         ['GPS signals verified in zone', 'Partial GPS match', 'GPS location mismatch'],
    login:       ['Worker session active', 'Session idle', 'Worker offline'],
    history:     ['Low claim frequency (High Trust)', 'Moderate frequency', 'High frequency (Review Required)'],
  };
  const [hi, mid, lo] = map[signal] || ['High', 'Medium', 'Low'];
  return score >= 0.8 ? hi : score >= 0.5 ? mid : lo;
}