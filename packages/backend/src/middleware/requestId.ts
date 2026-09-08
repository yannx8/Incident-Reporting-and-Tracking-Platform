import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger } from '../lib/logger.js';

declare module 'express' {
  interface Request {
    id?: string;
    log?: ReturnType<typeof createRequestLogger>;
  }
}

export const requestIdMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) ?? uuidv4();
  req.id = reqId;
  req.log = createRequestLogger(reqId);
  next();
};

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl, id, log } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    (log ?? console).info(
      { reqId: id, method, url: originalUrl, status: res.statusCode, durationMs: duration },
      `${method} ${originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  next();
};
