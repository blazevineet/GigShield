import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

// Ensure we have a secret even if .env is acting up during the demo
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_secret_for_demo_only_123';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    
    // Map the payload to the request user object
    // Checking both 'sub' and 'id' ensures compatibility with different token formats
    (req as any).user = { 
      id: payload.sub || payload.id, 
      role: payload.role 
    };

    if (!(req as any).user.id) {
      return next(new AppError('Token payload missing user identifier', 401));
    }

    next();
  } catch (err) {
    next(new AppError('Invalid or expired token', 401));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    // Safety check if authorize is used without authenticate
    if (!user) {
      return next(new AppError('Authentication context missing', 401));
    }

    if (!roles.includes(user.role)) {
      console.warn(`🚨 Access Denied: User ${user.id} with role ${user.role} tried to access ${req.originalUrl}`);
      return next(new AppError('Insufficient permissions', 403));
    }
    
    next();
  };
}