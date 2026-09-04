import { OrgRole, PrismaClient, Incident } from '@prisma/client';

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export interface AuthContext {
  userId: string;
  organizationId: string;
  roles: OrgRole[];
}

/**
 * Constructs a trusted server-side authorization context.
 * 
 * SECURITY BOUNDARY: The `trustedOrganizationId` MUST NOT come from a client request payload,
 * query parameter, or arbitrary frontend state. It must be derived securely by the authentication
 * layer (GIT-13/GIT-32) that verifies the user's current session against the database.
 */
export async function constructServerSideAuthContext(
  userId: string,
  trustedOrganizationId: string,
  prisma: PrismaClient
): Promise<AuthContext> {
  const memberships = await prisma.organizationMembership.findMany({
    where: {
      userId,
      organizationId: trustedOrganizationId,
      isActive: true,
    },
  });

  if (memberships.length === 0) {
    throw new AuthorizationError('User is not an active member of this organization.');
  }

  return {
    userId,
    organizationId: trustedOrganizationId,
    roles: memberships.map((m) => m.role),
  };
}

/**
 * Ensures the requested resource belongs to the user's active organization context.
 */
export function checkOrganizationOwnership(context: AuthContext, resourceOrganizationId: string) {
  if (context.organizationId !== resourceOrganizationId) {
    throw new AuthorizationError('Cross-organization access denied.');
  }
}

/**
 * Checks if the context has a specific role.
 */
export function hasRole(context: AuthContext, role: OrgRole): boolean {
  return context.roles.includes(role);
}

type IncidentContextFields = Pick<Incident, 'id' | 'organizationId' | 'siteId' | 'reporterId' | 'status'>;

/**
 * Evaluates whether the user can access an incident based on role rules.
 */
export async function canAccessIncident(
  context: AuthContext,
  incident: IncidentContextFields,
  prisma: PrismaClient
): Promise<boolean> {
  try {
    checkOrganizationOwnership(context, incident.organizationId);
  } catch {
    return false;
  }

  if (hasRole(context, 'ADMINISTRATOR')) {
    return true;
  }

  let hasUserAccess = false;
  let hasResponsableAccess = false;

  // USER can access their own reported incidents
  if (hasRole(context, 'USER') && incident.reporterId === context.userId) {
    hasUserAccess = true;
  }

  // RESPONSABLE can access incidents on their authorized sites that are explicitly assigned to them
  if (hasRole(context, 'RESPONSABLE')) {
    const profile = await prisma.responsableProfile.findUnique({
      where: { userId_organizationId: { userId: context.userId, organizationId: context.organizationId } },
      include: { responsableSites: true }
    });

    if (profile) {
      const hasSiteAccess = profile.responsableSites.some(rs => rs.siteId === incident.siteId && rs.isActive);
      
      if (hasSiteAccess) {
        // Must be explicitly assigned to this exact Responsable. Unassigned incidents are not visible here.
        const activeAssignments = await prisma.assignment.findMany({
          where: { 
            incidentId: incident.id, 
            status: { in: ['PENDING', 'ACCEPTED'] },
            responsableProfileId: profile.id
          }
        });

        if (activeAssignments.length > 0) {
          hasResponsableAccess = true;
        }
      }
    }
  }

  return hasUserAccess || hasResponsableAccess;
}

/**
 * Asserts the user can read the incident.
 */
export async function assertCanAccessIncident(
  context: AuthContext,
  incident: IncidentContextFields,
  prisma: PrismaClient
) {
  if (!(await canAccessIncident(context, incident, prisma))) {
    throw new AuthorizationError('Access denied: insufficient permissions for this incident.');
  }
}

/**
 * Asserts that the payload does not attempt to modify immutable original report fields.
 */
export function assertOriginalReportImmutable(updatePayload: Partial<Incident>) {
  const originalFields: Array<keyof Incident> = [
    'originalTitle', 
    'originalDescription', 
    'originalSeverity', 
    'originalReportedAt'
  ];
  
  const attemptingToModifyOriginal = originalFields.some(field => field in updatePayload && updatePayload[field] !== undefined);
  if (attemptingToModifyOriginal) {
    throw new AuthorizationError('Cannot modify the original submitted incident report.');
  }
}

/**
 * Asserts the user has the required permissions to close an incident.
 */
export function assertCanCloseIncident(context: AuthContext, incident: IncidentContextFields) {
  checkOrganizationOwnership(context, incident.organizationId);

  if (!hasRole(context, 'ADMINISTRATOR')) {
    throw new AuthorizationError('Only Administrators may close incidents.');
  }
}

/**
 * Asserts the user can delete the incident.
 */
export function assertCanDeleteIncident(context: AuthContext, incident: IncidentContextFields) {
  checkOrganizationOwnership(context, incident.organizationId);

  if (!hasRole(context, 'ADMINISTRATOR')) {
    throw new AuthorizationError('Only Administrators can delete incidents.');
  }
}

/**
 * Asserts that the user is an Administrator.
 */
export function assertIsAdministrator(context: AuthContext) {
  if (!hasRole(context, 'ADMINISTRATOR')) {
    throw new AuthorizationError('Only Administrators can perform this action.');
  }
}
