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

    // Create incident
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

    // Create an audit event for incident creation
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

    // We can filter by siteId or status via query params if provided
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

    // If USER role, they can only see their reported incidents.
    // However, if they are an ADMINISTRATOR, they can see all incidents in the organization.
    // If they are a RESPONSABLE, they can see incidents explicitly assigned to them on their authorized sites.
    // For `listIncidents` standard behavior, we might need a general access filter.
    // To keep it simple as per Sprint 2, let's filter by organization first. 
    // Wait, the authorization module has `canAccessIncident` but doing it in DB query is better.
    // Let's implement the basic organization scope filter for now.
    
    // The requirements say: "Create incidents.controller.ts with createIncident and listIncidents logic. Ensure strict tenant-ownership validation for the siteId (must exist, be active, and belong to the reporter's organization)."
    // It doesn't strictly say I have to implement full RBAC filtering for listIncidents, but let's do something basic or return all org incidents and maybe filter in memory if necessary, or just return org incidents.
    // To match typical behavior, I will return all incidents in the org. Full role-based filtering might be part of a later task, or maybe I should check `hasRole`.

    const incidents = await prisma.incident.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        site: {
          select: { id: true, name: true }
        }
      }
    });

    // Actually, I should use `canAccessIncident` for each to be safe if required.
    // Let's import `canAccessIncident` from authorization.
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
