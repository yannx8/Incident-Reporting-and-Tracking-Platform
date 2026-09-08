import { Prisma, PrismaClient } from '@prisma/client';
import { AuthContext } from '../../authorization/index.js';
import { NotFoundError } from '../../lib/errors.js';
import { PaginationParams, createPaginatedResponse, PaginatedResponse } from '../../lib/pagination.js';

export interface ListNotificationsFilters {
  unreadOnly?: boolean;
}

/**
 * NotificationsService handles fetching, filtering, and status updates for user notification items.
 * Enforces recipient and organization scoping boundaries on all queries.
 */
export class NotificationsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Fetches paginated notifications for the authenticated user within their active organization.
   * 
   * @param context Authenticated session context.
   * @param filters Query filter for unread-only status.
   * @param pagination Page index and size limits.
   * @returns Paginated list of Notification records.
   */
  async list(
    context: AuthContext,
    filters: ListNotificationsFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<unknown>> {
    const where: Prisma.NotificationWhereInput = {
      recipientId: context.userId,
      organizationId: context.organizationId,
    };

    if (filters.unreadOnly) {
      where.status = 'UNREAD';
    }

    const { page, pageSize } = pagination;
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return createPaginatedResponse(notifications, page, pageSize, total);
  }

  /**
   * Marks a notification as READ for the recipient user.
   * 
   * @param context Authenticated session context.
   * @param id Notification UUID.
   * @returns Updated Notification record.
   * @throws {NotFoundError} If notification is missing or recipient/org does not match.
   */
  async markRead(context: AuthContext, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientId: context.userId, organizationId: context.organizationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification');
    }

    if (notification.status === 'READ') {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: { status: 'READ', readAt: new Date() },
    });
  }
}