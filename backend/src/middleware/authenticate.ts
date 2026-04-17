import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';

// FIX: Added logging to detect secret issues during startup
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_secret_for_demo_only_123';

if (!process.env.JWT_ACCESS_SECRET) {
  console.warn('⚠️ WARNING: JWT_ACCESS_SECRET not found in .env. Using demo fallback secret.');
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Access denied.', 401));
  }

  const token = header.slice(7);
  try {
    // Verify the token
    const payload = jwt.verify(token, JWT_SECRET) as any;
    
    // DEMO FIX: Ensuring we capture ID regardless of payload naming (id vs sub)
    const userId = payload.sub || payload.id || payload.userId;
    
    if (!userId) {
      logger.error('Token verification failed: No user identifier in payload');
      return next(new AppError('Invalid token payload', 401));
    }

    (req as any).user = { 
      id: userId, 
      role: payload.role || 'WORKER' // Fallback to WORKER for demo
    };

    next();
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Authentication failed');
    // If the token expired during your testing, this will tell you exactly why
    const message = err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token';
    next(new AppError(message, 401));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return next(new AppError('Authentication context missing', 401));
    }

    if (!roles.includes(user.role)) {
      logger.warn(`Forbidden access attempt: User ${user.id} (${user.role}) -> ${req.originalUrl}`);
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    
    next();
  };
}