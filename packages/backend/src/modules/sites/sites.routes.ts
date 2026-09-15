import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

function ctx(req: any) {
  if (!req.auth) throw new AppError('AUTH_REQUIRED', 401, 'Authentication required');
  return req.auth;
}

function perimeterData(body: any) {
  const boundaryType = body.boundaryType === undefined ? undefined : String(body.boundaryType);
  const radiusMeters = body.radiusMeters === undefined || body.radiusMeters === null ? undefined : Number(body.radiusMeters);
  if (boundaryType !== undefined && boundaryType !== 'CIRCLE') {
    throw new AppError('VALIDATION_ERROR', 400, 'Only circular site perimeters are supported');
  }
  if (radiusMeters !== undefined && (!Number.isFinite(radiusMeters) || radiusMeters < 25 || radiusMeters > 5000)) {
    throw new AppError('VALIDATION_ERROR', 400, 'Site perimeter radius must be between 25 and 5000 meters');
  }
  return { boundaryType: boundaryType as 'CIRCLE' | undefined, radiusMeters };
}

router.get('/', async (req: any, res, next) => {
  try {
    const a = ctx(req);
    res.json(await prisma.site.findMany({ where: { organizationId: a.organizationId }, orderBy: { name: 'asc' } }));
  } catch (e) {
    next(e);
  }
});

router.post('/', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = ctx(req);
    const b = req.body as any;
    const name = String(b.name || '').trim();
    const address = b.address == null ? null : String(b.address).trim();
    const latitude = Number(b.latitude);
    const longitude = Number(b.longitude);
    const perimeter = perimeterData(b);
    // Coordinate bounds check: lat [-90, 90], lon [-180, 180].
    // Invalid ranges would break PostGIS spatial queries and map rendering.
    if (
      name.length < 2 ||
      name.length > 150 ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    )
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid site data');
    const s = await prisma.site.create({
      data: {
        name,
        address,
        latitude,
        longitude,
        boundaryType: perimeter.boundaryType || 'CIRCLE',
        radiusMeters: perimeter.radiusMeters || 250,
        isActive: b.isActive !== false,
        organizationId: a.organizationId
      }
    });
    res.status(201).json(s);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = ctx(req);
    const b = req.body as any;
    const data: any = {};
    const perimeter = perimeterData(b);
    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (name.length < 2 || name.length > 150) throw new AppError('VALIDATION_ERROR', 400, 'Invalid site name');
      data.name = name;
    }
    if (b.address !== undefined) data.address = b.address == null ? null : String(b.address).trim();
    if (b.latitude !== undefined) {
      data.latitude = Number(b.latitude);
      if (!Number.isFinite(data.latitude) || data.latitude < -90 || data.latitude > 90)
        throw new AppError('VALIDATION_ERROR', 400, 'Invalid latitude');
    }
    if (b.longitude !== undefined) {
      data.longitude = Number(b.longitude);
      if (!Number.isFinite(data.longitude) || data.longitude < -180 || data.longitude > 180)
        throw new AppError('VALIDATION_ERROR', 400, 'Invalid longitude');
    }
    if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);
    if (perimeter.boundaryType !== undefined) data.boundaryType = perimeter.boundaryType;
    if (perimeter.radiusMeters !== undefined) data.radiusMeters = perimeter.radiusMeters;
    const s = await prisma.site.updateMany({ where: { id: req.params.id, organizationId: a.organizationId }, data });
    if (!s.count) throw new AppError('NOT_FOUND', 404, 'Site not found');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
