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
 * Validates authentication and constructs the Authorization context.
 * Checks for active organization membership.
 */
export async function buildAuthContext(
  userId: string,
  organizationId: string,
  prisma: PrismaClient
): Promise<AuthContext> {
  const memberships = await prisma.organizationMembership.findMany({
    where: {
      userId,
      organizationId,
      isActive: true,
    },
  });

  if (memberships.length === 0) {
    throw new AuthorizationError('User is not an active member of this organization.');
  }

  return {
    userId,
    organizationId,
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

/**
 * Asserts the context has at least one of the required roles.
 */
export function assertHasRole(context: AuthContext, roles: OrgRole[]) {
  if (!roles.some(role => hasRole(context, role))) {
    throw new AuthorizationError(`Requires one of the following roles: ${roles.join(', ')}`);
  }
}

type IncidentContextFields = Pick<Incident, 'id' | 'organizationId' | 'siteId' | 'reporterId' | 'status'>;

/**
 * Evaluates whether the user can access an incident based on role rules.
 * Does not check for mutation rules.
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

  // RESPONSABLE can access incidents on their authorized sites
  if (hasRole(context, 'RESPONSABLE')) {
    const profile = await prisma.responsableProfile.findUnique({
      where: { userId_organizationId: { userId: context.userId, organizationId: context.organizationId } },
      include: { responsableSites: true }
    });

    if (profile) {
      const hasSiteAccess = profile.responsableSites.some(rs => rs.siteId === incident.siteId && rs.isActive);
      
      if (hasSiteAccess) {
        // Must be assigned to this Responsable, or unassigned.
        const activeAssignments = await prisma.assignment.findMany({
          where: { 
            incidentId: incident.id, 
            status: { in: ['PENDING', 'ACCEPTED'] } 
          }
        });

        if (activeAssignments.length > 0) {
          // If assigned to anyone, must be assigned to me
          if (activeAssignments.some(a => a.responsableProfileId === profile.id)) {
            hasResponsableAccess = true;
          }
        } else {
          // Unassigned, site access is enough
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
export async function assertCanReadIncident(
  context: AuthContext,
  incident: IncidentContextFields,
  prisma: PrismaClient
) {
  if (!(await canAccessIncident(context, incident, prisma))) {
    throw new AuthorizationError('Access denied: insufficient permissions for this incident.');
  }
}

/**
 * Asserts the user can update the incident with the given payload.
 */
export async function assertCanUpdateIncident(
  context: AuthContext,
  incident: IncidentContextFields,
  updatePayload: Partial<Incident>,
  prisma: PrismaClient
) {
  // First, verify read access implies base access
  await assertCanReadIncident(context, incident, prisma);

  // User cannot modify the original submitted incident details
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

  // Only Administrator may close an incident
  if (updatePayload.status === 'CLOSED' && !hasRole(context, 'ADMINISTRATOR')) {
    throw new AuthorizationError('Only Administrators may close incidents.');
  }
}

/**
 * Asserts the user can delete the incident.
 */
export function assertCanDeleteIncident(context: AuthContext) {
  if (!hasRole(context, 'ADMINISTRATOR')) {
    throw new AuthorizationError('Only Administrators can delete incidents.');
  }
}
