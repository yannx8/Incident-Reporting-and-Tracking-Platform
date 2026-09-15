import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

const router = Router();

function ctx(req: any) {
  if (!req.auth) throw new AppError('AUTH_REQUIRED', 401, 'Authentication required');
  return req.auth;
}

router.get('/', async (req: any, res, next) => {
  try {
    const a = ctx(req);
    res.json(await prisma.notification.findMany({ where: { recipientId: a.userId }, orderBy: { createdAt: 'desc' }, take: 50 }));
  } catch (e) {
    next(e);
  }
});

// updateMany returns 0 count if the notification doesn't belong to this user,
// which doubles as an ownership check without a separate SELECT.
router.patch('/:id/read', async (req: any, res, next) => {
  try {
    const a = ctx(req);
    const n = await prisma.notification.updateMany({
      where: { id: req.params.id, recipientId: a.userId },
      data: { readAt: new Date() }
    });
    if (!n.count) throw new AppError('FORBIDDEN', 403, 'Notification not yours');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
