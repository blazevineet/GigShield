import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger }   from '../config/logger';

export function errorHandler(
  err:  Error,
  req:  Request,
  res:  Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Operational error');
    }
    return res.status(err.statusCode).json({
      error:   err.message,
      status:  err.statusCode,
      path:    req.path,
    });
  }

  // Prisma errors
  if ((err as any).code === 'P2002') {
    return res.status(409).json({ error: 'Record already exists', status: 409 });
  }
  if ((err as any).code === 'P2025') {
    return res.status(404).json({ error: 'Record not found', status: 404 });
  }

  // Unknown errors
  logger.error({ err, path: req.path }, 'Unexpected error');
  res.status(500).json({
    error:  process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    status: 500,
  });
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, status: 404 });
}
