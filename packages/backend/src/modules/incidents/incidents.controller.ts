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

    const { listIncidentsQuerySchema } = await import('./incidents.schema.js');
    const validationResult = listIncidentsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid query parameters', details: validationResult.error.format() });
    }

    const { siteId, status, severity, priority, category, reporterId, assignedToMe, search } = validationResult.data;

    const whereClause: any = {
      organizationId: authContext.organizationId,
    };

    if (siteId) whereClause.siteId = siteId;
    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;
    if (priority !== undefined) whereClause.priority = priority;
    if (category) whereClause.category = category;
    if (reporterId) whereClause.reporterId = reporterId;

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (assignedToMe) {
      const profile = await prisma.responsableProfile.findUnique({
        where: { userId_organizationId: { userId: authContext.userId, organizationId: authContext.organizationId } }
      });
      if (!profile) {
        return res.status(200).json({ incidents: [] });
      }
      whereClause.assignments = {
        some: {
          responsableProfileId: profile.id,
          status: { in: ['PENDING', 'ACCEPTED'] }
        }
      };
    }

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

export const updateAssignmentStatus = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) return res.status(401).json({ error: 'Authentication required' });

    const incidentId = req.params.id as string;
    const assignmentId = req.params.assignmentId as string;

    const { updateAssignmentStatusSchema } = await import('./incidents.schema.js');
    const validationResult = updateAssignmentStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid input', details: validationResult.error.format() });
    }

    const { status, reason } = validationResult.data;

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (incident.organizationId !== authContext.organizationId) return res.status(403).json({ error: 'Cross-organization access denied.' });

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { responsableProfile: true }
    });

    if (!assignment || assignment.incidentId !== incidentId) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.responsableProfile.userId !== authContext.userId) {
      return res.status(403).json({ error: 'Only the assigned responsable can update this assignment' });
    }

    if (assignment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only update PENDING assignments' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.assignment.update({
        where: { id: assignmentId },
        data: { status }
      });

      if (status === 'ACCEPTED') {
        await tx.incident.update({
          where: { id: incidentId },
          data: { status: 'IN_PROGRESS' }
        });
      }

      await tx.auditEvent.create({
        data: {
          organizationId: authContext.organizationId,
          incidentId,
          actorId: authContext.userId,
          eventType: status === 'ACCEPTED' ? 'ASSIGNMENT_ACCEPTED' : 'REASSIGNMENT_REQUESTED',
          metadata: { assignmentId, reason }
        }
      });
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('updateAssignmentStatus error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProgressUpdate = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) return res.status(401).json({ error: 'Authentication required' });

    const incidentId = req.params.id as string;
    
    const { createProgressUpdateSchema } = await import('./incidents.schema.js');
    const validationResult = createProgressUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid input', details: validationResult.error.format() });
    }
    
    const { type, content } = validationResult.data;

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (incident.organizationId !== authContext.organizationId) return res.status(403).json({ error: 'Cross-organization access denied.' });

    // Enforce that the user is the currently assigned Responsable
    const profile = await prisma.responsableProfile.findUnique({
      where: { userId_organizationId: { userId: authContext.userId, organizationId: authContext.organizationId } }
    });
    if (!profile) return res.status(403).json({ error: 'User is not a responsable' });

    const assignment = await prisma.assignment.findFirst({
      where: {
        incidentId,
        responsableProfileId: profile.id,
        status: 'ACCEPTED'
      }
    });

    if (!assignment) {
      return res.status(403).json({ error: 'Only the accepted assigned responsable can post progress updates' });
    }

    const progressUpdate = await prisma.progressUpdate.create({
      data: {
        incidentId,
        authorId: authContext.userId,
        type,
        content
      }
    });

    return res.status(201).json({ progressUpdate });
  } catch (error) {
    console.error('createProgressUpdate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const resolveIncident = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) return res.status(401).json({ error: 'Authentication required' });

    const incidentId = req.params.id as string;
    
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (incident.organizationId !== authContext.organizationId) return res.status(403).json({ error: 'Cross-organization access denied.' });

    // Enforce that the user is the currently assigned Responsable
    const profile = await prisma.responsableProfile.findUnique({
      where: { userId_organizationId: { userId: authContext.userId, organizationId: authContext.organizationId } }
    });
    if (!profile) return res.status(403).json({ error: 'User is not a responsable' });

    const assignment = await prisma.assignment.findFirst({
      where: {
        incidentId,
        responsableProfileId: profile.id,
        status: 'ACCEPTED'
      }
    });

    if (!assignment) {
      return res.status(403).json({ error: 'Only the accepted assigned responsable can resolve this incident' });
    }
    
    if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') {
       return res.status(400).json({ error: 'Incident is already resolved or closed' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { id: incidentId },
        data: { status: 'RESOLVED' }
      });

      await tx.auditEvent.create({
        data: {
          organizationId: authContext.organizationId,
          incidentId,
          actorId: authContext.userId,
          eventType: 'RESOLUTION_SUBMITTED',
          metadata: {}
        }
      });
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('resolveIncident error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const closeIncident = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) return res.status(401).json({ error: 'Authentication required' });

    const incidentId = req.params.id as string;

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { assertCanCloseIncident } = await import('../../authorization/index.js');
    try {
      assertCanCloseIncident(authContext, incident);
    } catch (authError: any) {
      return res.status(403).json({ error: authError.message });
    }
    
    if (incident.status === 'CLOSED') {
      return res.status(400).json({ error: 'Incident is already closed' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { id: incidentId },
        data: { status: 'CLOSED' }
      });

      await tx.auditEvent.create({
        data: {
          organizationId: authContext.organizationId,
          incidentId,
          actorId: authContext.userId,
          eventType: 'INCIDENT_CLOSED',
          metadata: {}
        }
      });
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('closeIncident error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const authContext = req.authContext;
    if (!authContext) return res.status(401).json({ error: 'Authentication required' });

    const incidentId = req.params.id as string;

    const { createCommentSchema } = await import('./incidents.schema.js');
    const validationResult = createCommentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid input', details: validationResult.error.format() });
    }

    const { body } = validationResult.data;

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { assertCanAccessIncident } = await import('../../authorization/index.js');
    try {
      await assertCanAccessIncident(authContext, incident, prisma);
    } catch (authError: any) {
      return res.status(403).json({ error: authError.message });
    }

    const comment = await prisma.comment.create({
      data: {
        incidentId,
        authorId: authContext.userId,
        body
      }
    });

    return res.status(201).json({ comment });
  } catch (error) {
    console.error('addComment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
