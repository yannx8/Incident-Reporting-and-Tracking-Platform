import pino, { type LoggerOptions } from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'info'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'incident-tracking-api',
  },
};

if (isDevelopment) {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(options);

export const childLogger = (bindings: Record<string, unknown>) => logger.child(bindings);

export function createRequestLogger(reqId: string, userId?: string, organizationId?: string) {
  return logger.child({
    reqId,
    userId,
    organizationId,
  });
}
