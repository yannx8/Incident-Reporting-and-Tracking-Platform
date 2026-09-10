import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from '../lib/errors.js';

export const requireRole = (...roles: UserRole[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.auth || !roles.some(r => req.auth!.roles.includes(r))) {
    return next(new AppError('FORBIDDEN_ROLE', 403, 'Insufficient role'));
  }
  next();
};
