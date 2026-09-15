import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

function ctx(req: any) {
  if (!req.auth) throw new AppError('AUTH_REQUIRED', 401, 'Authentication required');
  return req.auth;
}

router.get('/', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = ctx(req);
    res.json(
      await prisma.responsableProfile.findMany({
        where: { organizationId: a.organizationId },
        include: { user: true, specialties: { include: { specialty: true } }, sites: { include: { site: true } } }
      })
    );
  } catch (e) {
    next(e);
  }
});

// Catalog of specialty names used in the team form (deduplicated)
router.get('/specialties', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = ctx(req);
    res.json(await prisma.specialty.findMany({ where: { organizationId: a.organizationId }, orderBy: { name: 'asc' } }));
  } catch (e) {
    next(e);
  }
});

// Org members that can be promoted to responsables (excludes existing responsables)
router.get('/candidates', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = ctx(req);
    const existing = await prisma.responsableProfile.findMany({
      where: { organizationId: a.organizationId },
      select: { userId: true }
    });
    const existingIds = existing.map((r) => r.userId);
    const members = await prisma.organizationMembership.findMany({
      where: { organizationId: a.organizationId, status: 'ACTIVE', userId: { notIn: existingIds } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: 'asc' } }
    });
    res.json(members.map((m) => m.user));
  } catch (e) {
    next(e);
  }
});

// Update responsable: toggle active, assign specialties and sites (by id arrays)
router.patch('/:id', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = ctx(req);
    const b = req.body as any;
    const existing = await prisma.responsableProfile.findFirst({
      where: { id: req.params.id, organizationId: a.organizationId }
    });
    if (!existing) throw new AppError('NOT_FOUND', 404, 'Responsable not found');

    const data: any = {};
    if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);

    await prisma.$transaction(async (tx) => {
      if (b.isActive !== undefined) await tx.responsableProfile.update({ where: { id: existing.id }, data });
      if (Array.isArray(b.specialtyIds)) {
        await tx.responsableSpecialty.deleteMany({ where: { responsableProfileId: existing.id } });
        for (const sid of b.specialtyIds) {
          const spec = await tx.specialty.findFirst({ where: { id: sid, organizationId: a.organizationId } });
          if (spec) await tx.responsableSpecialty.create({ data: { responsableProfileId: existing.id, specialtyId: sid } });
        }
      }
      if (Array.isArray(b.siteIds)) {
        await tx.responsableSite.deleteMany({ where: { responsableProfileId: existing.id } });
        for (const sid of b.siteIds) {
          const site = await tx.site.findFirst({ where: { id: sid, organizationId: a.organizationId } });
          if (site) await tx.responsableSite.create({ data: { responsableProfileId: existing.id, siteId: sid, isActive: true } });
        }
      }
    });
    const updated = await prisma.responsableProfile.findUnique({
      where: { id: existing.id },
      include: { user: true, specialties: { include: { specialty: true } }, sites: { include: { site: true } } }
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Create specialty (used by team form when typing a new specialty name)
router.post('/specialties', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = ctx(req);
    const name = String(req.body?.name || '').trim();
    if (name.length < 2 || name.length > 60) throw new AppError('VALIDATION_ERROR', 400, 'Invalid specialty name');
    const s = await prisma.specialty.upsert({
      where: { organizationId_name: { organizationId: a.organizationId, name } },
      create: { organizationId: a.organizationId, name },
      update: {}
    });
    res.status(201).json(s);
  } catch (e) {
    next(e);
  }
});

// Upsert creates or reactivates a responsable profile. The membership role
// mutation must happen in a separate statement (not in the same transaction)
// because Prisma's `set` replaces the full array and we need to preserve
// existing roles while adding RESPONSABLE.
router.post('/', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = ctx(req);
    const { userId } = req.body;
    if (typeof userId !== 'string') throw new AppError('VALIDATION_ERROR', 400, 'userId required');
    const membership = await prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: a.organizationId, userId } }
    });
    if (!membership || membership.status !== 'ACTIVE')
      throw new AppError('FORBIDDEN_TENANT', 403, 'User is not an active member of this organization');
    const r = await prisma.responsableProfile.upsert({
      where: { organizationId_userId: { organizationId: a.organizationId, userId } },
      create: { organizationId: a.organizationId, userId },
      update: { isActive: true }
    });
    // `set` replaces the complete role collection, so preserve every role that
    // already exists and only add RESPONSABLE when it is absent.
    const updatedRoles = membership.roles.includes(UserRole.RESPONSABLE)
      ? membership.roles
      : [...membership.roles, UserRole.RESPONSABLE];
    await prisma.organizationMembership.update({
      where: { organizationId_userId: { organizationId: a.organizationId, userId } },
      data: { roles: { set: updatedRoles } }
    });
    res.status(201).json(r);
  } catch (e) {
    next(e);
  }
});

export default router;
