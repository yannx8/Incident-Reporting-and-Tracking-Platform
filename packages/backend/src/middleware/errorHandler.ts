import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AuthorizationError } from '../authorization/index.js';
import { isAppError, formatErrorResponse, ValidationError, InternalError, ConflictError, NotFoundError, ForbiddenError } from '../lib/errors.js';

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const log = req.log ?? console;
  const requestId = req.id ?? 'unknown';

  if (isAppError(err)) {
    log.warn({ err: formatErrorResponse(err), requestId }, 'Application error');
    return res.status(err.statusCode).json(formatErrorResponse(err));
  }

  if (err instanceof AuthorizationError) {
    const forbiddenError = new ForbiddenError(err.message);
    log.warn({ err: formatErrorResponse(forbiddenError), requestId }, 'Authorization error');
    return res.status(403).json(formatErrorResponse(forbiddenError));
  }

  if (err instanceof ZodError) {
    const validationError = new ValidationError(
      err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
    );
    log.warn({ err: formatErrorResponse(validationError), requestId }, 'Validation error');
    return res.status(400).json(formatErrorResponse(validationError));
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const conflictError = new ConflictError('CONFLICT', 'A record with this value already exists');
      log.warn({ err: formatErrorResponse(conflictError), requestId, prismaCode: err.code }, 'Unique constraint violation');
      return res.status(409).json(formatErrorResponse(conflictError));
    }
    if (err.code === 'P2025') {
      const notFoundError = new NotFoundError('Record');
      log.warn({ err: formatErrorResponse(notFoundError), requestId, prismaCode: err.code }, 'Record not found');
      return res.status(404).json(formatErrorResponse(notFoundError));
    }
  }

  log.error({ err, requestId }, 'Internal server error');
  const internalError = new InternalError();
  return res.status(500).json(formatErrorResponse(internalError));
};

export const notFoundHandler = (_req: Request, res: Response) => {
  const notFoundError = new NotFoundError('Route');
  res.status(404).json(formatErrorResponse(notFoundError));
};