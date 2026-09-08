export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>[] | undefined;

  constructor(code: string, message: string, statusCode: number, details?: Record<string, unknown>[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, unknown>[]) {
    super('VALIDATION_ERROR', 'Request validation failed', 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHENTICATED', message, 401);
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions for this operation') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(code: 'CONFLICT' | 'INVALID_STATE_TRANSITION', message: string) {
    super(code, message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests') {
    super('RATE_LIMITED', message, 429);
    this.name = 'RateLimitedError';
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super('INTERNAL_ERROR', message, 500);
    this.name = 'InternalError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function formatErrorResponse(error: AppError): { error: { code: string; message: string; details?: Record<string, unknown>[] } } {
  const response: { error: { code: string; message: string; details?: Record<string, unknown>[] } } = {
    error: {
      code: error.code,
      message: error.message,
    },
  };
  if (error.details && error.details.length > 0) {
    response.error.details = error.details;
  }
  return response;
}