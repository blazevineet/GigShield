import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXP = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
const REFRESH_EXP = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

// ── Token helpers ────────────────────────────────────────
function signAccess(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, ACCESS_SECRET, { expiresIn: ACCESS_EXP });
}

function signRefresh(userId: string) {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    if (count > 5) throw new AppError('Too many OTP requests.', 429);

    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, name: 'Gig Worker', role: 'WORKER' },
    });

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    
    // Log for terminal testing
    logger.info({ phone, otp }, '[SMS SIMULATION] OTP Generated');

    await prisma.otpRequest.create({
      data: { 
        userId: user.id, 
        otp: otpHash, 
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) 
      },
    });

    res.json({ message: 'OTP sent successfully' });
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

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { workerProfile: true },
    });
    if (!user) throw new AppError('User not found', 404);

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
      accessToken,
      refreshToken: refreshRaw,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        hasProfile: !!user.workerProfile,
        zone: user.workerProfile?.zone || null, // Fixed property name
      },
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────
// Token/Session Management (Ensure these are exported)
// ────────────────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: raw } = req.body;
    if (!raw) throw new AppError('Refresh token required', 400);

    const payload = jwt.verify(raw, REFRESH_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new AppError('User not found', 404);

    res.json({ accessToken: signAccess(user.id, user.role) });
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
    res.json({ message: 'Logged out' });
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
    res.json({ user });
  } catch (err) {
    next(err);
  }
}