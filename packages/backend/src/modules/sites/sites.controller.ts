import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateSiteSchema, UpdateSiteSchema } from './sites.schema.js';
import { AuthContext, assertIsAdministrator } from '../../authorization/index.js';

const prisma = new PrismaClient();

export const createSite = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    assertIsAdministrator(authContext);

    const parsedData = CreateSiteSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsedData.error.issues });
    }

    const { name, address } = parsedData.data;

    const site = await prisma.site.create({
      data: {
        name,
        address: address || null,
        organizationId: authContext.organizationId,
        isActive: true,
      },
    });

    res.status(201).json(site);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error creating site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listSites = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { activeOnly } = req.query;

    const whereClause: any = {
      organizationId: authContext.organizationId,
    };

    if (activeOnly === 'true') {
      whereClause.isActive = true;
    }

    const sites = await prisma.site.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(sites);
  } catch (error: any) {
    console.error('Error listing sites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSite = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    assertIsAdministrator(authContext);

    const siteId = req.params.id as string;
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    const parsedData = UpdateSiteSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsedData.error.issues });
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.organizationId !== authContext.organizationId) {
      return res.status(403).json({ error: 'Cross-organization access denied.' });
    }

    const updateData: any = {};
    if (parsedData.data.name !== undefined) updateData.name = parsedData.data.name;
    if (parsedData.data.address !== undefined) updateData.address = parsedData.data.address || null;
    if (parsedData.data.isActive !== undefined) updateData.isActive = parsedData.data.isActive;

    const updatedSite = await prisma.site.update({
      where: { id: siteId },
      data: updateData,
    });

    res.status(200).json(updatedSite);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error updating site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
