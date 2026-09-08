import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  Prisma,
  PrismaClient,
  ProgressUpdateType,
} from '@prisma/client';
import {
  AuthContext,
  assertCanCloseIncident,
  assertIsAdministrator,
  canAccessIncident,
} from '../../authorization/index.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors.js';
import { PaginationParams, createPaginatedResponse, PaginatedResponse } from '../../lib/pagination.js';
import { assertValidIncidentTransition, isTerminal } from './incident-lifecycle.js';

type IncidentWithSite = Incident & {
  site: { id: string; name: string };
};

export interface CreateIncidentInput {
  siteId: string;
  title: string;
  description: string;
  category: string;
  severity: IncidentSeverity;
}

export interface TriageIncidentInput {
  classificationNotes?: string;
  priority?: number;
  requiredSpecialtyId?: string;
}

export interface ListIncidentsFilters {
  siteId?: string | undefined;
  status?: IncidentStatus | undefined;
  severity?: IncidentSeverity | undefined;
  priority?: number | undefined;
  category?: string | undefined;
  reporterId?: string | undefined;
  assignedToMe?: boolean | undefined;
  search?: string | undefined;
}

export interface AssignIncidentInput {
  responsableProfileId: string;
}

export interface UpdateAssignmentStatusInput {
  status: 'ACCEPTED' | 'REASSIGNMENT_REQUESTED';
  reason?: string;
}

export interface CreateProgressUpdateInput {
  type: ProgressUpdateType;
  content: string;
}

const AUDIT_ACTOR_FIELDS = {
  select: {
    id: true,
    displayName: true,
    email: true,
  },
} as const;

/**
 * IncidentsService owns the core business logic, lifecycle transitions, authorization checks,
 * assignment workflows, and audit logging for incident records within an organization.
 */
export class IncidentsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Creates a new incident report for an active site within the caller's organization.
   * Preserves original report fields (title, description, category, severity, timestamp)
   * to guarantee an immutable historical audit baseline.
   * 
   * @param context Authenticated session context containing userId and organizationId.
   * @param input Incident creation fields.
   * @returns Newly created Incident database record.
   * @throws {NotFoundError} If target site does not exist within organization scope.
   * @throws {ValidationError} If target site is inactive.
   */
  async create(context: AuthContext, input: CreateIncidentInput): Promise<Incident> {
    const site = await this.prisma.site.findFirst({
      where: { id: input.siteId, organizationId: context.organizationId },
    });

    if (!site) {
      throw new NotFoundError('Site');
    }
    if (!site.isActive) {
      throw new ValidationError([{ field: 'siteId', message: 'Site is inactive' }]);
    }

    // Original fields mirror initial values and are immutable after creation.
    const incident = await this.prisma.incident.create({
      data: {
        organizationId: context.organizationId,
        siteId: input.siteId,
        reporterId: context.userId,
        status: 'NEW',
        severity: input.severity,
        title: input.title,
        description: input.description,
        category: input.category,
        originalTitle: input.title,
        originalDescription: input.description,
        originalCategory: input.category,
        originalSeverity: input.severity,
        originalReportedAt: new Date(),
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        organizationId: context.organizationId,
        incidentId: incident.id,
        actorId: context.userId,
        eventType: 'INCIDENT_CREATED',
        metadata: { title: input.title, severity: input.severity, siteId: input.siteId },
      },
    });

    return incident;
  }

  /**
   * Fetches a paginated list of incidents filtered by context role permissions and optional query filters.
   * - ADMINISTRATOR: Can query all organization incidents.
   * - RESPONSABLE: Can query assigned incidents or reported incidents.
   * - USER: Can query reported incidents only.
   * 
   * @param context Authenticated session context.
   * @param filters Query filtering parameters (siteId, status, severity, search, etc.).
   * @param pagination Page index and size parameters.
   * @returns Paginated list of incidents with site details.
   */
  async list(
    context: AuthContext,
    filters: ListIncidentsFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<IncidentWithSite>> {
    const { page, pageSize } = pagination;
    const where = await this.buildListWhere(context, filters);
    const total = await this.prisma.incident.count({ where });

    const incidents = await this.prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        site: { select: { id: true, name: true } },
      },
    });

    return createPaginatedResponse(incidents, page, pageSize, total);
  }

  private async buildListWhere(
    context: AuthContext,
    filters: ListIncidentsFilters
  ): Promise<Prisma.IncidentWhereInput> {
    const where: Prisma.IncidentWhereInput = {
      organizationId: context.organizationId,
    };

    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.status) where.status = filters.status as IncidentStatus;
    if (filters.severity) where.severity = filters.severity as IncidentSeverity;
    if (filters.priority !== undefined) where.priority = filters.priority;
    if (filters.category) where.category = filters.category;
    if (filters.reporterId) where.reporterId = filters.reporterId;

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (context.roles.includes('ADMINISTRATOR')) {
      return where;
    }

    const access: Prisma.IncidentWhereInput[] = [{ reporterId: context.userId }];

    if (context.roles.includes('RESPONSABLE')) {
      const profile = await this.prisma.responsableProfile.findUnique({
        where: {
          userId_organizationId: {
            userId: context.userId,
            organizationId: context.organizationId,
          },
        },
      });
      if (profile) {
        access.push({
          assignments: {
            some: {
              responsableProfileId: profile.id,
              status: { in: ['PENDING', 'ACCEPTED'] },
            },
          },
        });
      }
    }

    if (filters.assignedToMe) {
      const profile = await this.prisma.responsableProfile.findUnique({
        where: {
          userId_organizationId: {
            userId: context.userId,
            organizationId: context.organizationId,
          },
        },
      });
      if (!profile) {
        return { organizationId: context.organizationId, reporterId: context.userId, id: '__none__' };
      }
      return {
        organizationId: context.organizationId,
        assignments: {
          some: {
            responsableProfileId: profile.id,
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        },
      };
    }

    const baseOR = where.OR;
    delete where.OR;

    return {
      ...where,
      AND: [
        {
          OR: baseOR ? [{ OR: baseOR }, ...access] : access,
        },
      ],
    };
  }

  /**
   * Retrieves a single incident by ID within organization scope and validates read permissions.
   * 
   * @param context Authenticated session context.
   * @param id Incident UUID.
   * @returns Incident details record including site name and active assignments.
   * @throws {NotFoundError} If incident does not exist or caller lacks access.
   */
  async getById(context: AuthContext, id: string): Promise<IncidentWithSite> {
    const incident = await this.prisma.incident.findFirst({
      where: { id, organizationId: context.organizationId },
      include: {
        site: { select: { id: true, name: true } },
        assignments: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          select: { id: true, status: true, responsableProfileId: true },
        },
      },
    });

    if (!incident) {
      throw new NotFoundError('Incident');
    }
    if (!(await canAccessIncident(context, incident, this.prisma))) {
      throw new NotFoundError('Incident');
    }

    return incident;
  }

  /**
   * Fetches the full audit history stream for a specified incident.
   * 
   * @param context Authenticated session context.
   * @param id Incident UUID.
   * @returns Chronological list of AuditEvent records with actor details.
   * @throws {NotFoundError} If incident is missing or unauthorized.
   */
  async getHistory(context: AuthContext, id: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!incident) {
      throw new NotFoundError('Incident');
    }
    if (!(await canAccessIncident(context, incident, this.prisma))) {
      throw new NotFoundError('Incident');
    }

    return this.prisma.auditEvent.findMany({
      where: { incidentId: id, organizationId: context.organizationId },
      orderBy: { createdAt: 'desc' },
      include: { actor: AUDIT_ACTOR_FIELDS },
    });
  }

  /**
   * Performs administrative triage on an incident, updating classification notes, priority, or required specialty.
   * 
   * @param context Authenticated session context (must have ADMINISTRATOR role).
   * @param id Incident UUID.
   * @param input Triage update options.
   * @returns Updated Incident record.
   * @throws {ForbiddenError} If context caller is not an Administrator.
   * @throws {ConflictError} If incident is in a terminal state (CLOSED).
   */
  async triage(context: AuthContext, id: string, input: TriageIncidentInput): Promise<Incident> {
    assertIsAdministrator(context);

    const incident = await this.requireScopedIncident(context, id);
    this.requireSchedulable(incident);

    if (input.requiredSpecialtyId) {
      const specialty = await this.prisma.specialty.findFirst({
        where: { id: input.requiredSpecialtyId, organizationId: context.organizationId },
      });
      if (!specialty) {
        throw new NotFoundError('Specialty');
      }
    }

    const updateData: Prisma.IncidentUpdateInput = {};
    if (input.classificationNotes !== undefined) {
      updateData.classificationNotes = input.classificationNotes;
    }
    if (input.priority !== undefined) {
      updateData.priority = input.priority;
    }
    if (input.requiredSpecialtyId !== undefined) {
      updateData.requiredSpecialty = { connect: { id: input.requiredSpecialtyId } };
    } else if (input.requiredSpecialtyId === null) {
      updateData.requiredSpecialty = { disconnect: true };
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.auditEvent.create({
      data: {
        organizationId: context.organizationId,
        incidentId: id,
        actorId: context.userId,
        eventType: 'CLASSIFICATION_CHANGE',
        metadata: {
          classificationNotes: input.classificationNotes,
          priority: input.priority,
          requiredSpecialtyId: input.requiredSpecialtyId ?? null,
        },
      },
    });

    return updated;
  }

  /**
   * Resolves eligible Responsable profiles for an incident, sorted by ascending active workload.
   * 
   * @param context Authenticated session context (ADMINISTRATOR role required).
   * @param id Incident UUID.
   * @returns List of eligible Responsable profiles with workload metadata.
   */
  async getEligibleResponsables(context: AuthContext, id: string) {
    assertIsAdministrator(context);
    const incident = await this.requireScopedIncident(context, id);

    const profiles = await this.prisma.responsableProfile.findMany({
      where: {
        organizationId: context.organizationId,
        responsableSites: { some: { siteId: incident.siteId } },
        ...(incident.requiredSpecialtyId
          ? { specialties: { some: { specialtyId: incident.requiredSpecialtyId } } }
          : {}),
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        assignments: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
        },
      },
    });

    return profiles
      .map((profile) => ({
        id: profile.id,
        user: profile.user,
        activeWorkload: profile.assignments.length,
        isSiteMatch: true,
        isSpecialtyMatch: true,
      }))
      .sort((a, b) => a.activeWorkload - b.activeWorkload);
  }

  /**
   * Assigns an incident to a Responsable profile, superseding prior active assignments.
   * 
   * @param context Authenticated session context (ADMINISTRATOR role required).
   * @param id Incident UUID.
   * @param input Object containing target responsableProfileId.
   * @returns Created PENDING Assignment record.
   * @throws {ValidationError} If responsable profile is not site-authorized or specialty-matched.
   * @throws {ConflictError} If incident status cannot accept new assignments.
   */
  async assign(context: AuthContext, id: string, input: AssignIncidentInput) {
    assertIsAdministrator(context);
    const incident = await this.requireScopedIncident(context, id);
    this.requireSchedulable(incident);

    const assignableStates: IncidentStatus[] = ['NEW', 'ASSIGNED'];
    if (!assignableStates.includes(incident.status)) {
      throw new ConflictError(
        'INVALID_STATE_TRANSITION',
        `Cannot assign an incident in status ${incident.status}`
      );
    }

    const profile = await this.prisma.responsableProfile.findUnique({
      where: { id: input.responsableProfileId },
      include: {
        responsableSites: { where: { siteId: incident.siteId } },
        ...(incident.requiredSpecialtyId
          ? { specialties: { where: { specialtyId: incident.requiredSpecialtyId } } }
          : {}),
      },
    });

    if (!profile || profile.organizationId !== context.organizationId) {
      throw new ValidationError([{ field: 'responsableProfileId', message: 'Invalid responsable profile' }]);
    }
    if ((profile.responsableSites || []).length === 0) {
      throw new ValidationError([{ field: 'responsableProfileId', message: 'Responsable is not authorized for this site' }]);
    }
    if (incident.requiredSpecialtyId && (!profile.specialties || profile.specialties.length === 0)) {
      throw new ValidationError([{ field: 'responsableProfileId', message: 'Responsable does not have the required specialty' }]);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.assignment.updateMany({
        where: { incidentId: id, status: { in: ['PENDING', 'ACCEPTED'] } },
        data: { status: 'SUPERSEDED' },
      });

      const assignment = await tx.assignment.create({
        data: {
          incidentId: id,
          responsableProfileId: input.responsableProfileId,
          assignedById: context.userId,
          organizationId: context.organizationId,
          status: 'PENDING',
        },
      });

      await tx.incident.update({
        where: { id },
        data: { status: 'ASSIGNED' },
      });

      await tx.auditEvent.create({
        data: {
          organizationId: context.organizationId,
          incidentId: id,
          actorId: context.userId,
          eventType: 'ASSIGNMENT_CREATED',
          metadata: { assignmentId: assignment.id, responsableProfileId: input.responsableProfileId },
        },
      });

      return assignment;
    });
  }

  /**
   * Updates an assignment status (ACCEPTED or REASSIGNMENT_REQUESTED) by the assigned Responsable.
   * Accepting an assignment automatically advances the incident status to IN_PROGRESS.
   * 
   * @param context Authenticated session context (assigned Responsable required).
   * @param id Incident UUID.
   * @param assignmentId Target Assignment UUID.
   * @param input Object containing status update and optional reason.
   * @returns Success object.
   * @throws {ForbiddenError} If caller is not the assigned Responsable.
   * @throws {ConflictError} If assignment is not in PENDING status.
   */
  async updateAssignmentStatus(
    context: AuthContext,
    id: string,
    assignmentId: string,
    input: UpdateAssignmentStatusInput
  ) {
    const incident = await this.requireScopedIncident(context, id);

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { responsableProfile: true },
    });

    if (!assignment || assignment.incidentId !== id || assignment.organizationId !== context.organizationId) {
      throw new NotFoundError('Assignment');
    }

    if (assignment.responsableProfile.userId !== context.userId) {
      throw new ForbiddenError('Only the assigned responsable can update this assignment');
    }
    if (assignment.status !== 'PENDING') {
      throw new ConflictError('INVALID_STATE_TRANSITION', 'Can only update PENDING assignments');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.assignment.update({
        where: { id: assignmentId },
        data: { status: input.status, ...(input.reason ? { reason: input.reason } : {}) },
      });

      if (input.status === 'ACCEPTED') {
        assertValidIncidentTransition(incident.status, 'IN_PROGRESS');
        await tx.incident.update({
          where: { id },
          data: { status: 'IN_PROGRESS' },
        });
      }

      await tx.auditEvent.create({
        data: {
          organizationId: context.organizationId,
          incidentId: id,
          actorId: context.userId,
          eventType: input.status === 'ACCEPTED' ? 'ASSIGNMENT_ACCEPTED' : 'REASSIGNMENT_REQUESTED',
          metadata: { assignmentId, ...(input.reason ? { reason: input.reason } : {}) },
        },
      });
    });

    return { success: true };
  }

  /**
   * Adds a progress update entry to an incident in progress.
   * 
   * @param context Authenticated session context (accepted Responsable required).
   * @param id Incident UUID.
   * @param input Update type and body content.
   * @returns Created ProgressUpdate record.
   * @throws {ConflictError} If incident is in CLOSED status.
   * @throws {ForbiddenError} If caller is not the accepted Responsable.
   */
  async createProgressUpdate(context: AuthContext, id: string, input: CreateProgressUpdateInput) {
    const incident = await this.requireScopedIncident(context, id);
    if (incident.status === 'CLOSED') {
      throw new ConflictError('INVALID_STATE_TRANSITION', 'Cannot add progress to a closed incident');
    }
    if (!isTerminal(incident.status) && incident.status !== 'IN_PROGRESS' && incident.status !== 'ASSIGNED') {
      throw new ConflictError('INVALID_STATE_TRANSITION', `Cannot add progress in status ${incident.status}`);
    }

    const assignment = await this.findAcceptedAssignment(context, id);
    if (!assignment) {
      throw new ForbiddenError('Only the accepted assigned responsable can post progress updates');
    }

    return this.prisma.progressUpdate.create({
      data: {
        incidentId: id,
        authorId: context.userId,
        type: input.type,
        content: input.content,
      },
    });
  }

  /**
   * Marks an incident as RESOLVED by the assigned Responsable.
   * 
   * @param context Authenticated session context.
   * @param id Incident UUID.
   * @returns Success object.
   * @throws {ForbiddenError} If caller is not the accepted assigned Responsable.
   */
  async resolve(context: AuthContext, id: string) {
    const incident = await this.requireScopedIncident(context, id);
    const assignment = await this.findAcceptedAssignment(context, id);
    if (!assignment) {
      throw new ForbiddenError('Only the accepted assigned responsable can resolve this incident');
    }

    assertValidIncidentTransition(incident.status, 'RESOLVED');

    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { id },
        data: { status: 'RESOLVED' },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: context.organizationId,
          incidentId: id,
          actorId: context.userId,
          eventType: 'RESOLUTION_SUBMITTED',
          metadata: {},
        },
      });
    });

    return { success: true };
  }

  /**
   * Confirms final closure of an incident by an Administrator.
   * 
   * @param context Authenticated session context (ADMINISTRATOR role required).
   * @param id Incident UUID.
   * @returns Success object.
   * @throws {ForbiddenError} If context user is not an Administrator.
   */
  async close(context: AuthContext, id: string) {
    const incident = await this.requireScopedIncident(context, id);
    assertCanCloseIncident(context, incident);

    assertValidIncidentTransition(incident.status, 'CLOSED');

    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { id },
        data: { status: 'CLOSED' },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: context.organizationId,
          incidentId: id,
          actorId: context.userId,
          eventType: 'INCIDENT_CLOSED',
          metadata: {},
        },
      });
    });

    return { success: true };
  }

  /**
   * Adds a user comment to an incident after verifying organization scoping and authorization.
   * 
   * @param context Authenticated session context.
   * @param id Incident UUID.
   * @param body Text body of the comment.
   * @returns Created Comment database record.
   * @throws {NotFoundError} If incident is missing or user lacks access.
   */
  async addComment(context: AuthContext, id: string, body: string) {
    const incident = await this.requireScopedIncident(context, id);
    if (!(await canAccessIncident(context, incident, this.prisma))) {
      throw new NotFoundError('Incident');
    }

    return this.prisma.comment.create({
      data: { incidentId: id, authorId: context.userId, body },
    });
  }

  /**
   * Ensures incident is not in a terminal state (e.g. CLOSED) before allowing modifications.
   */
  private requireSchedulable(incident: { status: IncidentStatus }): void {
    if (isTerminal(incident.status)) {
      throw new ConflictError(
        'INVALID_STATE_TRANSITION',
        `Cannot modify an incident in status ${incident.status}`
      );
    }
  }

  /**
   * Resolves an incident by ID within organization boundaries.
   */
  private async requireScopedIncident(context: AuthContext, id: string): Promise<Incident> {
    const incident = await this.prisma.incident.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!incident) {
      throw new NotFoundError('Incident');
    }
    return incident;
  }

  /**
   * Resolves the active ACCEPTED assignment for the caller's Responsable profile.
   */
  private async findAcceptedAssignment(context: AuthContext, id: string) {
    const profile = await this.prisma.responsableProfile.findUnique({
      where: {
        userId_organizationId: {
          userId: context.userId,
          organizationId: context.organizationId,
        },
      },
    });
    if (!profile) {
      return null;
    }

    return this.prisma.assignment.findFirst({
      where: { incidentId: id, responsableProfileId: profile.id, status: 'ACCEPTED' },
    });
  }
}