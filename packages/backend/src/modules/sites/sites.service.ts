import { Prisma, PrismaClient } from '@prisma/client';
import { AuthContext, assertIsAdministrator } from '../../authorization/index.js';
import { NotFoundError } from '../../lib/errors.js';
import { PaginationParams, createPaginatedResponse, PaginatedResponse } from '../../lib/pagination.js';

export interface CreateSiteInput {
  name: string;
  address?: string;
}

export interface UpdateSiteInput {
  name?: string;
  address?: string;
  isActive?: boolean;
}

export interface ListSitesFilters {
  activeOnly?: boolean;
}

export class SitesService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(context: AuthContext, input: CreateSiteInput) {
    assertIsAdministrator(context);
    return this.prisma.site.create({
      data: {
        name: input.name,
        address: input.address ?? null,
        organizationId: context.organizationId,
        isActive: true,
      },
    });
  }

  async list(
    context: AuthContext,
    filters: ListSitesFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<unknown>> {
    const where: Prisma.SiteWhereInput = {
      organizationId: context.organizationId,
    };
    if (filters.activeOnly) {
      where.isActive = true;
    }

    const { page, pageSize } = pagination;
    const [sites, total] = await Promise.all([
      this.prisma.site.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prisma.site.count({ where }),
    ]);

    return createPaginatedResponse(sites, page, pageSize, total);
  }

  async update(context: AuthContext, id: string, input: UpdateSiteInput) {
    assertIsAdministrator(context);

    const site = await this.prisma.site.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!site) {
      throw new NotFoundError('Site');
    }

    const data: Prisma.SiteUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.address !== undefined) data.address = input.address || null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    return this.prisma.site.update({ where: { id }, data });
  }
}