import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

// Short access token TTL limits damage if an access token is intercepted.
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AccessTokenPayload {
  userId: string;
  type: 'access';
}

/**
 * Resolves the JWT secret key from environment configuration.
 * 
 * @returns The secret key string.
 * @throws {Error} If JWT_SECRET environment variable is missing.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Signs a short-lived JWT access token bound to a user ID.
 * 
 * @param userId Unique identifier of the authenticated user.
 * @returns Signed JWT string.
 */
export function signAccessToken(userId: string): string {
  const payload: AccessTokenPayload = { userId, type: 'access' };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}

/**
 * Verifies and decodes a JWT access token payload.
 * 
 * @param token Signed JWT access token string.
 * @returns Validated token payload.
 * @throws {jwt.JsonWebTokenError} If signature check fails or token type is invalid.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === 'string' || decoded.type !== 'access' || !decoded.userId) {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return { userId: decoded.userId, type: 'access' };
}

/**
 * Generates a cryptographically secure random string for refresh tokens (48 bytes).
 * 
 * @returns High-entropy hexadecimal string.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Computes SHA-256 digest of a refresh token.
 * Raw refresh tokens are never stored plain-text in database to limit compromise scope.
 * 
 * @param token Raw refresh token secret.
 * @returns Hex-encoded SHA-256 hash.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a cryptographically secure random string for password reset tokens (32 bytes).
 * 
 * @returns High-entropy hexadecimal string.
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes SHA-256 digest of a password reset token for safe database storage.
 * 
 * @param token Raw password reset token secret.
 * @returns Hex-encoded SHA-256 hash.
 */
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const TOKEN_CONFIG = {
  accessTokenTtl: ACCESS_TOKEN_TTL,
  refreshTokenTtlMs: REFRESH_TOKEN_TTL_MS,
  resetTokenTtlMs: RESET_TOKEN_TTL_MS,
  accessTokenCookieMaxAgeMs: 15 * 60 * 1000,
  refreshTokenCookieMaxAgeMs: REFRESH_TOKEN_TTL_MS,
};
