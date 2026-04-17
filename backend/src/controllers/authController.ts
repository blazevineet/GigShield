import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_secret_for_demo';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
const ACCESS_EXP = (process.env.JWT_ACCESS_EXPIRES_IN || '1h') as SignOptions['expiresIn'];
const REFRESH_EXP = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

// 🚨 THE HOLY GRAIL: Only this number can be Admin
const ADMIN_PHONE = '+919999999999';

// ── Token helpers ────────────────────────────────────────
function signAccess(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, ACCESS_SECRET, { expiresIn: ACCESS_EXP });
}

// ────────────────────────────────────────────────────────
// POST /auth/otp/send
// ────────────────────────────────────────────────────────
export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = req.body;

    const key = `otp_rate:${phone}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 600);
    if (count > 20) throw new AppError('Too many OTP requests.', 429);

    const isAdminNumber = phone === ADMIN_PHONE; 
    
    // UPSERT: Create if not exists, but FORCE the role on every login attempt
    const user = await prisma.user.upsert({
      where: { phone },
      update: { 
        role: isAdminNumber ? 'ADMIN' : 'WORKER',
        name: isAdminNumber ? 'Admin (Demo)' : undefined // Don't overwrite worker names
      },
      create: { 
        phone, 
        name: isAdminNumber ? 'Admin (Demo)' : 'Gig Worker', 
        role: isAdminNumber ? 'ADMIN' : 'WORKER' 
      },
    });

    const otp = "123456"; 
    const otpHash = await bcrypt.hash(otp, 10);
    
    logger.info({ phone, role: user.role }, `[OTP SENT] Role assigned: ${user.role}`);

    await prisma.otpRequest.create({
      data: { 
        userId: user.id, 
        otp: otpHash, 
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) 
      },
    });

    res.json({ 
      success: true,
      message: 'OTP sent successfully', 
      demoOtp: otp 
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────
// POST /auth/otp/verify
// ────────────────────────────────────────────────────────
export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, otp } = req.body;

    // Fetch user and force role check again to be 100% sure
    let user = await prisma.user.findUnique({
      where: { phone },
      include: { workerProfile: true },
    });
    
    if (!user) throw new AppError('User not found', 404);

    // SECURITY CHECK: Ensure 9876543210 or others haven't hijacked Admin role
    const isAdminNumber = phone === ADMIN_PHONE;
    if (isAdminNumber && user.role !== 'ADMIN') {
        user = await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' }, include: { workerProfile: true }});
    } else if (!isAdminNumber && user.role === 'ADMIN') {
        // Automatically demote anyone who isn't the magic number
        user = await prisma.user.update({ where: { id: user.id }, data: { role: 'WORKER' }, include: { workerProfile: true }});
        logger.warn({ phone }, 'Unauthorized Admin role detected and revoked');
    }

    const otpRecord = await prisma.otpRequest.findFirst({
      where: { userId: user.id, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) throw new AppError('OTP expired or not found', 400);

    const valid = await bcrypt.compare(otp, otpRecord.otp);
    if (!valid) throw new AppError('Invalid OTP', 400);

    await prisma.otpRequest.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    const accessToken = signAccess(user.id, user.role);
    const refreshRaw = uuid();
    const refreshHash = await bcrypt.hash(refreshRaw, 10);

    await prisma.refreshToken.create({
      data: { 
        userId: user.id, 
        token: refreshHash, 
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
      },
    });

    res.json({
      success: true,
      accessToken,
      refreshToken: refreshRaw,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role, // This will now strictly follow the phone number logic
        hasProfile: !!user.workerProfile,
        zone: user.workerProfile?.zone || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ... rest of the file (refreshToken, logout, getMe) stays the same
// ────────────────────────────────────────────────────────
// Token/Session Management
// ────────────────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: raw } = req.body;
    if (!raw) throw new AppError('Refresh token required', 400);

    // Note: Verify against REFRESH_SECRET for refresh tokens
    const payload = jwt.verify(raw, REFRESH_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new AppError('User not found', 404);

    res.json({ 
      success: true,
      accessToken: signAccess(user.id, user.role) 
    });
  } catch (err) {
    next(new AppError('Invalid refresh token', 401));
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.id },
      include: { workerProfile: true },
    });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}