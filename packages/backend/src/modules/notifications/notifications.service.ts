import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

/**
 * Creates a notification for a user. Callers intentionally invoke this outside
 * any DB transaction so that notification failures never block or roll back the
 * primary operation (e.g. incident creation). A best-effort log replaces a
 * throw on failure.
 */
export async function createNotification(
  recipientId: string,
  eventType: string,
  title: string,
  body: string,
  incidentId?: string
) {
  try {
    await prisma.notification.create({
      data: { recipientId, eventType, title, body, incidentId }
    });
  } catch (err) {
    logger.error('Failed to create notification', { recipientId, eventType, error: String(err) });
  }
}
