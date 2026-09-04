import { Request, Response } from 'express';
import { assertIsAdministrator } from '../../authorization/index.js';
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

export const triageIncident = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) return res.status(401).json({ error: 'Authentication required' });
    try { assertIsAdministrator(authContext); } catch { return res.status(403).json({ error: 'Only Administrators can perform this action.' }); }

    const incidentId = req.params.id as string;
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (incident.organizationId !== authContext.organizationId) return res.status(403).json({ error: 'Cross-organization access denied.' });

    const { classificationNotes, priority, requiredSpecialtyId } = req.body;

    if (requiredSpecialtyId) {
      const specialty = await prisma.specialty.findUnique({ where: { id: requiredSpecialtyId } });
      if (!specialty) return res.status(400).json({ error: 'Specialty not found' });
      if (specialty.organizationId !== authContext.organizationId) return res.status(403).json({ error: 'Specialty does not belong to your organization' });
    }

    const updateData: any = {};
    if (classificationNotes !== undefined) updateData.classificationNotes = classificationNotes;
    if (priority !== undefined) updateData.priority = priority;
    if (requiredSpecialtyId !== undefined) updateData.requiredSpecialtyId = requiredSpecialtyId;
    else if (req.body.requiredSpecialtyId === null) updateData.requiredSpecialtyId = null;

    const updatedIncident = await prisma.incident.update({
      where: { id: incidentId },
      data: updateData
    });

    return res.status(200).json({ incident: updatedIncident });
  } catch (error) {
    console.error('Triage incident error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEligibleResponsables = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) return res.status(401).json({ error: 'Authentication required' });
    try { assertIsAdministrator(authContext); } catch { return res.status(403).json({ error: 'Only Administrators can perform this action.' }); }

    const incidentId = req.params.id as string;
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (incident.organizationId !== authContext.organizationId) return res.status(403).json({ error: 'Cross-organization access denied.' });

    const profiles = await prisma.responsableProfile.findMany({
      where: {
        organizationId: authContext.organizationId,
        responsableSites: { some: { siteId: incident.siteId } },
        ...(incident.requiredSpecialtyId ? { specialties: { some: { specialtyId: incident.requiredSpecialtyId } } } : {})
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        assignments: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } }
        }
      }
    });

    const eligible = profiles.map(p => ({
      id: p.id,
      user: p.user,
      activeWorkload: p.assignments.length,
      isSiteMatch: true,
      isSpecialtyMatch: true
    })).sort((a, b) => a.activeWorkload - b.activeWorkload);

    return res.status(200).json({ responsables: eligible });
  } catch (error) {
    console.error('getEligibleResponsables error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) return res.status(401).json({ error: 'Authentication required' });
    try { assertIsAdministrator(authContext); } catch { return res.status(403).json({ error: 'Only Administrators can perform this action.' }); }

    const incidentId = req.params.id as string;
    const responsableProfileId = req.body.responsableProfileId;
    if (!responsableProfileId) return res.status(400).json({ error: 'responsableProfileId is required' });

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (incident.organizationId !== authContext.organizationId) return res.status(403).json({ error: 'Cross-organization access denied.' });

    const includeOptions: any = {
      responsableSites: { where: { siteId: incident.siteId } }
    };
    if (incident.requiredSpecialtyId) {
      includeOptions.specialties = { where: { specialtyId: incident.requiredSpecialtyId } };
    }

    const profile = await prisma.responsableProfile.findUnique({
      where: { id: responsableProfileId },
      include: includeOptions
    });

    if (!profile || profile.organizationId !== authContext.organizationId) {
      return res.status(400).json({ error: 'Invalid responsable profile' });
    }
    if ((profile.responsableSites || []).length === 0) {
      return res.status(400).json({ error: 'Responsable is not authorized for this site' });
    }
    if (incident.requiredSpecialtyId && (!profile.specialties || profile.specialties.length === 0)) {
      return res.status(400).json({ error: 'Responsable does not have the required specialty' });
    }

    const assignment = await prisma.$transaction(async (tx) => {
      await tx.assignment.updateMany({
        where: { incidentId, status: { in: ['PENDING', 'ACCEPTED'] } },
        data: { status: 'SUPERSEDED' }
      });

      const newAssignment = await tx.assignment.create({
        data: {
          incidentId,
          responsableProfileId,
          assignedById: authContext.userId,
          organizationId: authContext.organizationId,
          status: 'PENDING'
        }
      });

      await tx.incident.update({
        where: { id: incidentId },
        data: { status: 'ASSIGNED' }
      });

      await tx.auditEvent.create({
        data: {
          organizationId: authContext.organizationId,
          incidentId,
          actorId: authContext.userId,
          eventType: 'ASSIGNMENT_CREATED',
          metadata: { assignmentId: newAssignment.id, responsableProfileId }
        }
      });

      return newAssignment;
    });

    return res.status(201).json({ assignment });
  } catch (error) {
    console.error('createAssignment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
