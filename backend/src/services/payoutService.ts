/**
 * GigShield — Phase 3 Intelligent Payout Service
 * Includes ML-driven pre-flight validation and fraud prevention.
 */

import axios from 'axios';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const rzpClient = axios.create({
  baseURL: RAZORPAY_BASE,
  auth: { 
    username: process.env.RAZORPAY_KEY_ID!, 
    password: process.env.RAZORPAY_KEY_SECRET! 
  },
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export interface PayoutInput {
  claimId: string;
  upiId: string;
  amount: number;
}

/**
 * Validates the claim with the Python ML Engine before processing payment.
 * Fulfills Phase 3: Advanced Fraud Detection.
 */
async function validateWithML(claimId: string) {
  try {
    const claim = await prisma.claim.findUnique({ 
        where: { id: claimId },
        // Removed the .include({ trigger: true }) because triggers are fields in your schema
    });

    if (!claim) return { isSafe: false, reason: 'Claim data missing' };

    // Update these to match your schema.prisma field names
    const mlRes = await axios.post(`${ML_SERVICE_URL}/risk/score`, {
      zone: "Chennai", // You can update this to dynamic if you add zone to Claim
      trigger_type: claim.triggerType,
      value: claim.triggerValue,
      threshold: claim.threshold
    });

    const { risk_level, confidence, is_anomaly, alerts } = mlRes.data;

    if (is_anomaly) return { isSafe: false, reason: `ML Anomaly: ${alerts.join(', ')}` };
    if (confidence < 0.70) return { isSafe: false, reason: 'AI Confidence below threshold' };

    return { isSafe: true, risk_level, confidence };
  } catch (err) {
    logger.error('ML Validation unavailable');
    return { isSafe: true, fallback: true };
  }
}
export async function initiatePayout(input: PayoutInput) {
  const { claimId, upiId, amount } = input;
  if (!upiId) throw new AppError('Worker UPI ID not configured', 400);
  // --- STEP 1: Level Up ML Pre-flight Check ---
  const safety = await validateWithML(claimId);  
  if (!safety.isSafe) {
    logger.warn({ claimId, reason: safety.reason }, 'Payout blocked by ML Engine');
    await prisma.claim.update({
      where: { id: claimId },
      data: { status: 'MANUAL_REVIEW', notes: `Safety Block: ${safety.reason}` }
    });
    throw new AppError(`Payout blocked by Safety Engine: ${safety.reason}`, 403);
  }

  // Create payout record
  const payout = await prisma.payout.create({
    data: {
      claimId,
      amount,
      upiId,
      status: 'PROCESSING',
      // Store AI confidence in the payout record for audit trails
      metadata: safety.confidence ? { ai_confidence: safety.confidence } : {}
    },
  });

  try {
    // --- STEP 2: Razorpay Execution ---
    const rzpRes = await rzpClient.post('/payouts', {
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER!,
      fund_account: {
        account_type: 'vpa',
        vpa: { address: upiId },
        contact: {
          name: 'GigShield Worker',
          type: 'employee',
          reference_id: claimId,
        },
      },
      amount: amount * 100, // convert to paise
      currency: 'INR',
      mode: 'UPI',
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: claimId,
      narration: `GigShield Parametric Payout — Ref: ${claimId.slice(0, 8)}`,
    });

    // --- STEP 3: Final Update ---
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        razorpayPayoutId: rzpRes.data.id,
        status: 'SUCCESS',
        completedAt: new Date(),
      },
    });

    // Mark claim as settled
    await prisma.claim.update({
        where: { id: claimId },
        data: { status: 'SETTLED', settledAt: new Date() }
    });

    logger.info({ claimId, rzpId: rzpRes.data.id }, 'Phase 3 Intelligent Payout Complete');
    return { success: true, razorpayPayoutId: rzpRes.data.id, confidence: safety.confidence };

  } catch (err: any) {
    const reason = err?.response?.data?.error?.description || err.message;
    logger.error({ claimId, reason }, 'Razorpay Gateway Failure');

    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: 'FAILED', failureReason: reason },
    });

    throw new AppError(`Payment Gateway Error: ${reason}`, 502);
  }
}