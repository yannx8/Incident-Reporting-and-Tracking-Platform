import rateLimit from 'express-rate-limit';

export const RATE_LIMIT_MESSAGE = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests, please try again later',
  },
};

/**
 * Global rate limiting middleware for Express API routes.
 * Limits each IP address to 300 requests per 15-minute window to mitigate brute-force
 * and denial-of-service attempts while accommodating rich single-page application requests.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
});