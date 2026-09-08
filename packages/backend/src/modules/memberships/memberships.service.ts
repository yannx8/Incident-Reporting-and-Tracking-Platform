import { OrgRole, PrismaClient } from '@prisma/client';
import { AuthContext, assertIsAdministrator } from '../../authorization/index.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

export interface AssignRoleInput {
  userId: string;
  role: OrgRole;
}

export interface UpdateMembershipInput {
  isActive: boolean;
}

export interface AssignSiteInput {
  siteId: string;
}

export class MembershipsService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(context: AuthContext) {
    assertIsAdministrator(context);
    return this.prisma.organizationMembership.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  async assignRole(context: AuthContext, input: AssignRoleInput) {
    assertIsAdministrator(context);

    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) {
      throw new NotFoundError('User');
    }

    const membership = await this.prisma.organizationMembership.upsert({
      where: {
        userId_organizationId_role: {
          userId: input.userId,
          organizationId: context.organizationId,
          role: input.role,
        },
      },
      update: { isActive: true },
      create: {
        userId: input.userId,
        organizationId: context.organizationId,
        role: input.role,
        isActive: true,
      },
    });

    if (input.role === 'RESPONSABLE') {
      const profile = await this.prisma.responsableProfile.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: context.organizationId,
          },
        },
      });
      if (!profile) {
        await this.prisma.responsableProfile.create({
          data: {
            userId: input.userId,
            organizationId: context.organizationId,
            title: 'Responsable',
          },
        });
      }
    }

    return membership;
  }

  async revokeRole(context: AuthContext, id: string, input: UpdateMembershipInput) {
    assertIsAdministrator(context);

    const membership = await this.prisma.organizationMembership.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!membership) {
      throw new NotFoundError('Membership');
    }

    return this.prisma.organizationMembership.update({
      where: { id },
      data: { isActive: input.isActive },
    });
  }

  async assignResponsableSite(context: AuthContext, profileId: string, input: AssignSiteInput) {
    assertIsAdministrator(context);

    const profile = await this.prisma.responsableProfile.findFirst({
      where: { id: profileId, organizationId: context.organizationId },
    });
    if (!profile) {
      throw new NotFoundError('Responsable profile');
    }

    const site = await this.prisma.site.findFirst({
      where: { id: input.siteId, organizationId: context.organizationId },
    });
    if (!site) {
      throw new ValidationError([{ field: 'siteId', message: 'Site not found or access denied' }]);
    }

    return this.prisma.responsableSite.upsert({
      where: {
        responsableProfileId_siteId: {
          responsableProfileId: profileId,
          siteId: input.siteId,
        },
      },
      update: { isActive: true },
      create: {
        responsableProfileId: profileId,
        siteId: input.siteId,
        organizationId: context.organizationId,
        isActive: true,
      },
    });
  }

  async revokeResponsableSite(context: AuthContext, profileId: string, siteId: string) {
    assertIsAdministrator(context);

    const profile = await this.prisma.responsableProfile.findFirst({
      where: { id: profileId, organizationId: context.organizationId },
    });
    if (!profile) {
      throw new NotFoundError('Responsable profile');
    }

    try {
      return await this.prisma.responsableSite.update({
        where: {
          responsableProfileId_siteId: { responsableProfileId: profileId, siteId },
        },
        data: { isActive: false },
      });
    } catch {
      throw new NotFoundError('Responsable site assignment');
    }
  }
}