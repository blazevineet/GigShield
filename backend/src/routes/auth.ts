import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import {
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,
  getMe,
} from '../controllers/authController';

export const authRouter = Router();

// POST /api/v1/auth/otp/send
authRouter.post(
  '/otp/send',
  [
    body('phone')
      .matches(/^\+91[6-9]\d{9}$/)
      .withMessage('Please enter a valid Indian mobile number starting with +91'),
  ],
  validate,
  sendOtp
);

// POST /api/v1/auth/otp/verify
authRouter.post(
  '/otp/verify',
  [
    body('phone').matches(/^\+91[6-9]\d{9}$/).withMessage('Valid phone required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6-digit OTP required'),
  ],
  validate,
  verifyOtp
);

/** * FIXED: Changed from '/token/refresh' to '/refresh' 
 * This matches your frontend client.ts call seen in the console logs.
 */
authRouter.post('/refresh', refreshToken);

authRouter.post('/logout', authenticate, logout);
authRouter.get('/me', authenticate, getMe);