import { Request, Response, NextFunction } from 'express';
import bcrypt  from 'bcryptjs';
import jwt     from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma }  from '../config/db';
import { redis }   from '../config/redis';
import { logger }  from '../config/logger';
import { AppError } from '../utils/AppError';

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXP     = process.env.JWT_ACCESS_EXPIRES_IN  || '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ── Token helpers ────────────────────────────────────────
function signAccess(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, ACCESS_SECRET, { expiresIn: ACCESS_EXP } as any);
}

function signRefresh(userId: string) {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXP } as any);
}

// ── OTP helpers (production: replace with MSG91/Twilio) ──
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendSms(phone: string, otp: string) {
  // In production: call MSG91 / Twilio here
  logger.info({ phone, otp }, '[SMS] OTP sent (simulated in dev)');
}

// ────────────────────────────────────────────────────────
// POST /auth/otp/send
// ────────────────────────────────────────────────────────
export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = req.body;

    // Rate-limit OTP: max 3 per 10 minutes per phone
    const key   = `otp_rate:${phone}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 600);
    if (count > 3)   throw new AppError('Too many OTP requests. Try again in 10 minutes.', 429);

    // Upsert user
    const user = await prisma.user.upsert({
      where:  { phone },
      update: {},
      create: { phone, name: '' },
    });

    const otp        = generateOtp();
    const otpHash    = await bcrypt.hash(otp, 10);
    const expiresAt  = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await prisma.otpRequest.create({
      data: { userId: user.id, otp: otpHash, expiresAt },
    });

    await sendSms(phone, otp);

    res.json({ message: 'OTP sent successfully', expiresIn: 300 });
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
      where:   { phone },
      include: { workerProfile: true },
    });
    if (!user) throw new AppError('User not found', 404);

    // Find latest valid OTP
    const otpRecord = await prisma.otpRequest.findFirst({
      where: {
        userId:    user.id,
        used:      false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) throw new AppError('OTP expired or not found', 400);

    const valid = await bcrypt.compare(otp, otpRecord.otp);
    if (!valid)   throw new AppError('Invalid OTP', 400);

    // Mark OTP as used
    await prisma.otpRequest.update({
      where: { id: otpRecord.id },
      data:  { used: true },
    });

    // Mark user verified
    await prisma.user.update({
      where: { id: user.id },
      data:  { isVerified: true },
    });

    // Issue tokens
    const accessToken  = signAccess(user.id, user.role);
    const refreshRaw   = uuid();
    const refreshHash  = await bcrypt.hash(refreshRaw, 10);
    const refreshExpAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshHash, expiresAt: refreshExpAt },
    });

    res.json({
      accessToken,
      refreshToken:   refreshRaw,
      expiresIn:      900,              // 15 minutes
      user: {
        id:            user.id,
        name:          user.name,
        phone:         user.phone,
        role:          user.role,
        hasProfile:    !!user.workerProfile,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────
// POST /auth/token/refresh
// ────────────────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: raw } = req.body;
    if (!raw) throw new AppError('Refresh token required', 400);

    // Find all non-revoked tokens for the decoded user
    let payload: any;
    try {
      payload = jwt.verify(raw, REFRESH_SECRET);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const stored = await prisma.refreshToken.findMany({
      where: { userId: payload.sub, revoked: false, expiresAt: { gt: new Date() } },
    });

    let matchedId: string | null = null;
    for (const t of stored) {
      if (await bcrypt.compare(raw, t.token)) { matchedId = t.id; break; }
    }
    if (!matchedId) throw new AppError('Refresh token not recognised', 401);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user)  throw new AppError('User not found', 404);

    // Rotate refresh token
    await prisma.refreshToken.update({ where: { id: matchedId }, data: { revoked: true } });

    const newRefreshRaw  = uuid();
    const newRefreshHash = await bcrypt.hash(newRefreshRaw, 10);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: newRefreshHash, expiresAt: new Date(Date.now() + 7*24*60*60*1000) },
    });

    res.json({
      accessToken:  signAccess(user.id, user.role),
      refreshToken: newRefreshRaw,
      expiresIn:    900,
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────
// POST /auth/logout
// ────────────────────────────────────────────────────────
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data:  { revoked: true },
    });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────
// GET /auth/me
// ────────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: (req as any).user.id },
      include: { workerProfile: true },
      omit:    { aadhaarHash: true },
    } as any);
    if (!user) throw new AppError('User not found', 404);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
