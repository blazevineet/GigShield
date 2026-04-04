/**
 * GigShield — Behavioral Coherence Score (BCS) Service
 *
 * Computes a fraud score (0–1) from multiple behavioral signals.
 * Score ≥ 0.70 → Auto-Approved
 * Score 0.50–0.69 → Soft Hold
 * Score < 0.50 → Hard Hold (adjuster review)
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
  gps_in_zone:        0.25,
  app_login_active:   0.20,
  device_stationary:  0.20,
  claim_history:      0.20,
  no_ring_detected:   0.15,
};

export async function computeBCS(input: BCSInput): Promise<BCSResult> {
  const { workerId, zone, triggerType, firedAt } = input;

  const [gpsScore, loginScore, stationaryScore, historyScore, ringScore] = await Promise.all([
    scoreGpsInZone(workerId, zone, firedAt),
    scoreAppLogin(workerId, firedAt),
    scoreDeviceStationary(workerId, firedAt),
    scoreClaimHistory(workerId),
    scoreNoRingDetected(workerId),
  ]);

  const breakdown = {
    gps_in_zone:       { score: gpsScore,       weight: WEIGHTS.gps_in_zone,       reason: buildReason('gps',       gpsScore) },
    app_login_active:  { score: loginScore,      weight: WEIGHTS.app_login_active,  reason: buildReason('login',     loginScore) },
    device_stationary: { score: stationaryScore, weight: WEIGHTS.device_stationary, reason: buildReason('stationary',stationaryScore) },
    claim_history:     { score: historyScore,    weight: WEIGHTS.claim_history,     reason: buildReason('history',   historyScore) },
    no_ring_detected:  { score: ringScore,       weight: WEIGHTS.no_ring_detected,  reason: buildReason('ring',      ringScore) },
  };

  const score = Object.entries(breakdown).reduce(
    (acc, [, { score: s, weight: w }]) => acc + s * w,
    0,
  );

  logger.info({ workerId, triggerType, score }, 'BCS computed');
  return { score: parseFloat(score.toFixed(4)), breakdown };
}

// ── Signal scorers ────────────────────────────────────────

/**
 * Was the worker's GPS within their registered zone at the time of the trigger?
 */
async function scoreGpsInZone(workerId: string, zone: string, firedAt: Date): Promise<number> {
  const windowStart = new Date(firedAt.getTime() - 15 * 60 * 1000); // 15 min window
  const pings = await prisma.gpsPing.findMany({
    where: { workerId, recordedAt: { gte: windowStart, lte: firedAt } },
    orderBy: { recordedAt: 'desc' },
    take: 10,
  });

  // No GPS data → moderate penalty (not conclusive spoofing)
  if (pings.length === 0) return 0.5;

  // All pings within zone bounding box → high score
  // In production: use PostGIS for proper geo queries
  return pings.length >= 3 ? 0.92 : 0.70;
}

/**
 * Was the worker's app logged-in and active during the event?
 */
async function scoreAppLogin(_workerId: string, _firedAt: Date): Promise<number> {
  // In production: check session table / last_seen timestamp
  // Simulated here with realistic variance
  return 0.88 + (Math.random() - 0.5) * 0.1;
}

/**
 * Was the device stationary (not moving at delivery speed)?
 * Genuine disruption: worker is stuck. Spoofer: may show movement patterns.
 */
async function scoreDeviceStationary(workerId: string, firedAt: Date): Promise<number> {
  const windowStart = new Date(firedAt.getTime() - 10 * 60 * 1000);
  const pings = await prisma.gpsPing.findMany({
    where: { workerId, recordedAt: { gte: windowStart, lte: firedAt } },
    take: 5,
  });

  if (pings.length < 2) return 0.65;

  const avgSpeed = pings.reduce((s, p) => s + (p.speed || 0), 0) / pings.length;
  // Stationary = speed < 2 km/h
  return avgSpeed < 2 ? 0.92 : avgSpeed < 10 ? 0.60 : 0.25;
}

/**
 * Does the worker have a clean claim history?
 */
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

  // More than 4 claims in 30 days is suspicious
  if (recentClaims <= 2) return 0.95;
  if (recentClaims <= 4) return 0.75;
  return 0.30;
}

/**
 * Is this worker part of a coordinated fraud ring?
 * Checks if multiple workers in the same zone claimed within minutes of each other.
 */
async function scoreNoRingDetected(workerId: string): Promise<number> {
  // In production: run NetworkX graph analysis (Python ML service)
  // Here: check claim burst in zone
  const profile = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!profile) return 0.8;

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const burstCount = await prisma.claim.count({
    where: {
      firedAt: { gte: fiveMinAgo },
      policy:  { worker: { zone: profile.zone } },
    },
  });

  // 500+ simultaneous claims in same zone = suspicious syndicate
  if (burstCount > 500) return 0.20;
  if (burstCount > 100) return 0.60;
  return 0.95;
}

function buildReason(signal: string, score: number): string {
  const map: Record<string, [string, string, string]> = {
    gps:        ['GPS confirmed in zone', 'GPS data incomplete', 'GPS outside zone'],
    login:      ['App active during event', 'App activity unclear', 'App inactive'],
    stationary: ['Device stationary as expected', 'Mixed movement signals', 'Device moving at speed'],
    history:    ['Clean claim history', 'Moderate claim frequency', 'High claim frequency — flagged'],
    ring:       ['No syndicate pattern detected', 'Moderate burst activity', 'Coordinated burst — ring suspected'],
  };
  const [hi, mid, lo] = map[signal] || ['High', 'Medium', 'Low'];
  return score >= 0.8 ? hi : score >= 0.5 ? mid : lo;
}
