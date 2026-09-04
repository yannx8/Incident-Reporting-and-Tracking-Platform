import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  CreateMembershipSchema, 
  UpdateMembershipSchema, 
  AssignSiteToResponsableSchema 
} from './memberships.schema.js';
import { AuthContext, assertIsAdministrator } from '../../authorization/index.js';

const prisma = new PrismaClient();

export const listMemberships = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    assertIsAdministrator(authContext);

    const memberships = await prisma.organizationMembership.findMany({
      where: {
        organizationId: authContext.organizationId,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, email: true, displayName: true }
        }
      }
    });

    res.status(200).json(memberships);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error listing memberships:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const assignRole = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    assertIsAdministrator(authContext);

    const parsedData = CreateMembershipSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsedData.error.issues });
    }

    const { userId, role } = parsedData.data;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Upsert membership
    const membership = await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId_role: {
          userId,
          organizationId: authContext.organizationId,
          role,
        }
      },
      update: {
        isActive: true,
      },
      create: {
        userId,
        organizationId: authContext.organizationId,
        role,
        isActive: true,
      },
    });

    if (role === 'RESPONSABLE') {
      const profile = await prisma.responsableProfile.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: authContext.organizationId
          }
        }
      });

      if (!profile) {
        await prisma.responsableProfile.create({
          data: {
            userId,
            organizationId: authContext.organizationId,
            title: 'Responsable',
          }
        });
      }
    }

    res.status(201).json(membership);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const revokeRole = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    assertIsAdministrator(authContext);

    const membershipId = req.params.id as string;
    if (!membershipId) {
      return res.status(400).json({ error: 'Membership ID is required' });
    }

    const parsedData = UpdateMembershipSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsedData.error.issues });
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    if (membership.organizationId !== authContext.organizationId) {
      return res.status(403).json({ error: 'Cross-organization access denied.' });
    }

    const updatedMembership = await prisma.organizationMembership.update({
      where: { id: membershipId },
      data: { isActive: parsedData.data.isActive },
    });

    res.status(200).json(updatedMembership);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error revoking role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const assignResponsableSite = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    assertIsAdministrator(authContext);

    // Reusing :id as membershipId? Wait, the route says:
    // POST /memberships/:id/sites
    // Let's assume :id is the user's ID or profile ID.
    // In plan: `POST /memberships/:id/sites: Authenticated, Administrator only (Assigns a site to a responsable).`
    // Let's assume :id is the `responsableProfileId` or `userId`. I'll assume it's `responsableProfileId`.
    const profileId = req.params.id as string;

    const parsedData = AssignSiteToResponsableSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsedData.error.issues });
    }

    const { siteId } = parsedData.data;

    const profile = await prisma.responsableProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Responsable profile not found' });
    }

    if (profile.organizationId !== authContext.organizationId) {
      return res.status(403).json({ error: 'Cross-organization access denied.' });
    }

    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site || site.organizationId !== authContext.organizationId) {
      return res.status(404).json({ error: 'Site not found or access denied.' });
    }

    const responsableSite = await prisma.responsableSite.upsert({
      where: {
        responsableProfileId_siteId: {
          responsableProfileId: profileId,
          siteId,
        }
      },
      update: {
        isActive: true,
      },
      create: {
        responsableProfileId: profileId,
        siteId,
        organizationId: authContext.organizationId,
        isActive: true,
      }
    });

    res.status(201).json(responsableSite);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error assigning site to responsable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const revokeResponsableSite = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    assertIsAdministrator(authContext);

    const profileId = req.params.id as string;
    const siteId = req.params.siteId as string;

    const profile = await prisma.responsableProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.organizationId !== authContext.organizationId) {
      return res.status(404).json({ error: 'Responsable profile not found or access denied.' });
    }

    const responsableSite = await prisma.responsableSite.update({
      where: {
        responsableProfileId_siteId: {
          responsableProfileId: profileId,
          siteId,
        }
      },
      data: {
        isActive: false,
      }
    });

    res.status(200).json(responsableSite);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error revoking responsable site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
