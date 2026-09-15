import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        organizationId: string;
        roles: any[];
        sessionId: string;
      };
    }
  }
}

/**
 * Authenticate requests via Bearer JWT token. Validates the token, checks that
 * the session hasn't been revoked or expired, and verifies the user's
 * organization membership is active.
 *
 * Populates req.auth with the authenticated user's context for downstream handlers.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) throw new AppError('AUTH_REQUIRED', 401, 'Authentication required');
    const p = jwt.verify(h.slice(7), env.JWT_SECRET) as { userId: string; organizationId: string; sessionId: string };
    // Verify session exists, belongs to the token holder, and hasn't been revoked/expired
    const session = await prisma.session.findFirst({
      where: {
        id: p.sessionId,
        userId: p.userId,
        organizationId: p.organizationId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });
    if (!session) throw new AppError('AUTH_INVALID', 401, 'Session expired or revoked');
    // Membership can be revoked independently of session; check it hasn't been deactivated
    const m = await prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: p.organizationId, userId: p.userId } }
    });
    if (!m || m.status !== 'ACTIVE') throw new AppError('AUTH_INVALID', 401, 'Membership inactive');
    req.auth = { userId: p.userId, organizationId: p.organizationId, roles: m.roles, sessionId: session.id };
    // Update lastUsedAt for session activity tracking; non-blocking for performance
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
    next();
  } catch (e) {
    next(e);
  }
}
