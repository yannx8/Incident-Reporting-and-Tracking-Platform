import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { incidentScope } from '../incidents/incidents.routes.js';

const router = Router();

function ctx(req: any) {
  if (!req.auth) throw new AppError('AUTH_REQUIRED', 401, 'Authentication required');
  return req.auth;
}

// Single endpoint returns both sites and incidents for the map view.
// Sites are org-wide (all org sites shown as reference points).
// Incidents use incidentScope to respect the user's role-based visibility
// (e.g. responsables see only their assigned incidents).
router.get('/data', async (req: any, res, next) => {
  try {
    const a = ctx(req);
    res.json({
      sites: await prisma.site.findMany({ where: { organizationId: a.organizationId } }),
      incidents: await prisma.incident.findMany({
        where: incidentScope(a),
        select: { id: true, title: true, status: true, priority: true, latitude: true, longitude: true }
      })
    });
  } catch (e) {
    next(e);
  }
});

export default router;
