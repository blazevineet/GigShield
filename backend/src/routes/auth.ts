import { Router } from 'express';
import { body }   from 'express-validator';
import { validate } from '../middleware/validate';
import {
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,
  getMe,
} from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';

export const authRouter = Router();

/**
 * POST /api/v1/auth/otp/send
 * Send OTP to worker's mobile number
 */
authRouter.post(
  '/otp/send',
  [
    body('phone')
      .matches(/^\+91[6-9]\d{9}$/)
      .withMessage('Valid Indian mobile number required'),
  ],
  validate,
  sendOtp,
);

/**
 * POST /api/v1/auth/otp/verify
 * Verify OTP → returns access + refresh tokens
 */
authRouter.post(
  '/otp/verify',
  [
    body('phone').matches(/^\+91[6-9]\d{9}$/).withMessage('Valid phone required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6-digit OTP required'),
  ],
  validate,
  verifyOtp,
);

/**
 * POST /api/v1/auth/token/refresh
 * Exchange refresh token for new access token
 */
authRouter.post('/token/refresh', refreshToken);

/**
 * POST /api/v1/auth/logout
 * Revoke refresh token
 */
authRouter.post('/logout', authenticate, logout);

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
authRouter.get('/me', authenticate, getMe);
