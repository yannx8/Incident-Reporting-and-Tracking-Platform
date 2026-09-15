import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from '../lib/errors.js';

/** Middleware factory: restrict access to users with at least one of the specified roles.
 *  Must be used after authenticate middleware. */
export const requireRole = (...roles: UserRole[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.auth || !roles.some(r => req.auth!.roles.includes(r))) {
    return next(new AppError('FORBIDDEN_ROLE', 403, 'Insufficient role'));
  }
  next();
};
