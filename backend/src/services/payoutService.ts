/**
 * GigShield — Payout Service
 * Integrates with Razorpay Payout API (test/sandbox mode)
 */

import axios   from 'axios';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';
const RZP_KEY       = process.env.RAZORPAY_KEY_ID!;
const RZP_SECRET    = process.env.RAZORPAY_KEY_SECRET!;
const RZP_ACCOUNT   = process.env.RAZORPAY_ACCOUNT_NUMBER!;

const rzpClient = axios.create({
  baseURL: RAZORPAY_BASE,
  auth:    { username: RZP_KEY, password: RZP_SECRET },
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export interface PayoutInput {
  claimId: string;
  upiId:   string;
  amount:  number;        // in INR (will convert to paise)
}

export async function initiatePayout(input: PayoutInput) {
  const { claimId, upiId, amount } = input;

  if (!upiId) throw new AppError('Worker UPI ID not configured', 400);

  // Create payout record
  const payout = await prisma.payout.create({
    data: {
      claimId,
      amount,
      upiId,
      status: 'PROCESSING',
    },
  });

  try {
    // In production: Razorpay Payout API call
    const rzpRes = await rzpClient.post('/payouts', {
      account_number: RZP_ACCOUNT,
      fund_account: {
        account_type: 'vpa',               // UPI
        vpa:          { address: upiId },
        contact: {
          name:          'GigShield Worker',
          type:          'employee',
          reference_id:  claimId,
        },
      },
      amount:      amount * 100,            // paise
      currency:    'INR',
      mode:        'UPI',
      purpose:     'payout',
      queue_if_low_balance: true,
      reference_id: claimId,
      narration:   `GigShield income protection — Claim ${claimId.slice(0, 8)}`,
    });

    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        razorpayPayoutId: rzpRes.data.id,
        status:           'SUCCESS',
        completedAt:      new Date(),
      },
    });

    logger.info({ claimId, amount, upiId, rzpId: rzpRes.data.id }, 'Payout successful');
    return { success: true, razorpayPayoutId: rzpRes.data.id };

  } catch (err: any) {
    const reason = err?.response?.data?.error?.description || err.message;
    logger.error({ claimId, reason }, 'Payout failed');

    await prisma.payout.update({
      where: { id: payout.id },
      data:  { status: 'FAILED', failureReason: reason },
    });

    // Revert claim to SOFT_HOLD for manual retry
    await prisma.claim.update({
      where: { id: claimId },
      data:  { status: 'SOFT_HOLD', notes: `Payout failed: ${reason}` },
    });

    throw new AppError(`Payout failed: ${reason}`, 502);
  }
}
