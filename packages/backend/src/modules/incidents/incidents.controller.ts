import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createIncidentSchema } from './incidents.schema.js';

const prisma = new PrismaClient();

export const createIncident = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validationResult = createIncidentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid input', details: validationResult.error.format() });
    }

    const { siteId, title, description, category, severity } = validationResult.data;

    // Tenant-ownership validation for siteId
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return res.status(400).json({ error: 'Site not found' });
    }

    if (!site.isActive) {
      return res.status(400).json({ error: 'Site is inactive' });
    }

    if (site.organizationId !== authContext.organizationId) {
      return res.status(403).json({ error: 'Site does not belong to your organization' });
    }

    const incident = await prisma.incident.create({
      data: {
        organizationId: authContext.organizationId,
        siteId,
        reporterId: authContext.userId,
        status: 'NEW',
        severity,
        category,
        title,
        description,
        originalTitle: title,
        originalDescription: description,
        originalCategory: category,
        originalSeverity: severity,
        originalReportedAt: new Date(),
      },
    });

    await prisma.auditEvent.create({
      data: {
        organizationId: authContext.organizationId,
        incidentId: incident.id,
        actorId: authContext.userId,
        eventType: 'INCIDENT_CREATED',
        metadata: {
          title,
          severity,
          siteId,
        },
      },
    });

    return res.status(201).json({ incident });
  } catch (error) {
    console.error('Create incident error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const listIncidents = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { siteId, status } = req.query;

    const whereClause: any = {
      organizationId: authContext.organizationId,
    };

    if (siteId && typeof siteId === 'string') {
      whereClause.siteId = siteId;
    }

    if (status && typeof status === 'string') {
      whereClause.status = status;
    }

    // TODO(GIT-XX): Implement full role-based filtering (USER sees own, ADMINISTRATOR sees all, RESPONSABLE sees assigned).
    // For now, we filter by organizationId as a baseline security boundary and rely on canAccessIncident for further validation.
    const incidents = await prisma.incident.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        site: {
          select: { id: true, name: true }
        }
      }
    });

    const { canAccessIncident } = await import('../../authorization/index.js');
    
    const accessibleIncidents = [];
    for (const incident of incidents) {
      if (await canAccessIncident(authContext, incident, prisma)) {
        accessibleIncidents.push(incident);
      }
    }

    return res.status(200).json({ incidents: accessibleIncidents });
  } catch (error) {
    console.error('List incidents error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
