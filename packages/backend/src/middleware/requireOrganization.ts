import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthContext, constructServerSideAuthContext } from '../authorization/index.js';

const prisma = new PrismaClient();

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

export const requireOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const organizationId = req.headers['x-organization-id'];

    if (!organizationId || typeof organizationId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid X-Organization-Id header' });
    }

    const context = await constructServerSideAuthContext(req.user.id, organizationId, prisma);
    
    req.authContext = context;
    next();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AuthorizationError') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Authorization error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
