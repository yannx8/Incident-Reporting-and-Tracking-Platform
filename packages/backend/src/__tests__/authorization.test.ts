import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient, IncidentStatus, OrganizationMembership, ResponsableProfile, ResponsableSite, Assignment } from '@prisma/client';
import {
  constructServerSideAuthContext,
  canAccessIncident,
  assertCanAccessIncident,
  assertOriginalReportImmutable,
  assertCanCloseIncident,
  assertCanDeleteIncident,
  checkOrganizationOwnership,
  AuthorizationError,
  AuthContext
} from '../authorization/index.js';

describe('Authorization Security Boundaries', () => {
  const prismaMock = {
    organizationMembership: {
      findMany: vi.fn(),
    },
    responsableProfile: {
      findUnique: vi.fn(),
    },
    assignment: {
      findMany: vi.fn(),
    },
  } as unknown as PrismaClient;

  const ORG_OWN = 'org-1';
  const ORG_OTHER = 'org-2';
  const USER_ID = 'user-1';
  const OTHER_USER_ID = 'user-2';
  const SITE_ID = 'site-1';
  const OTHER_SITE_ID = 'site-2';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Membership & Tenant Boundaries', () => {
    it('rejects inactive membership', async () => {
      vi.mocked(prismaMock.organizationMembership.findMany).mockResolvedValue([]);
      
      await expect(constructServerSideAuthContext(USER_ID, ORG_OWN, prismaMock))
        .rejects.toThrow('User is not an active member of this organization.');
    });

    it('rejects non-member access', async () => {
      vi.mocked(prismaMock.organizationMembership.findMany).mockResolvedValue([]);
      
      await expect(constructServerSideAuthContext(USER_ID, ORG_OWN, prismaMock))
        .rejects.toThrow(AuthorizationError);
    });

    it('succeeds for active membership', async () => {
      const activeMember: OrganizationMembership = {
        id: 'mem-1', userId: USER_ID, organizationId: ORG_OWN, role: 'USER', isActive: true, createdAt: new Date(), updatedAt: new Date()
      };
      vi.mocked(prismaMock.organizationMembership.findMany).mockResolvedValue([activeMember]);
      
      const ctx = await constructServerSideAuthContext(USER_ID, ORG_OWN, prismaMock);
      expect(ctx.userId).toBe(USER_ID);
      expect(ctx.organizationId).toBe(ORG_OWN);
      expect(ctx.roles).toContain('USER');
    });

    it('cross-organization access rejected', () => {
      const ctx: AuthContext = { userId: USER_ID, organizationId: ORG_OWN, roles: ['USER'] };
      expect(() => checkOrganizationOwnership(ctx, ORG_OTHER)).toThrow('Cross-organization access denied.');
    });
  });

  describe('Administrator Rules', () => {
    const mockIncident = { id: 'inc-1', organizationId: ORG_OWN, siteId: SITE_ID, reporterId: OTHER_USER_ID, status: 'NEW' as IncidentStatus };
    const mockOtherOrgIncident = { id: 'inc-2', organizationId: ORG_OTHER, siteId: SITE_ID, reporterId: OTHER_USER_ID, status: 'NEW' as IncidentStatus };
    const adminCtx: AuthContext = { userId: USER_ID, organizationId: ORG_OWN, roles: ['ADMINISTRATOR'] };

    it('Administrator of own organization allowed to access', async () => {
      expect(await canAccessIncident(adminCtx, mockIncident, prismaMock)).toBe(true);
    });

    it('Administrator of another organization denied access', async () => {
      expect(await canAccessIncident(adminCtx, mockOtherOrgIncident, prismaMock)).toBe(false);
    });

    it('Administrator can close an incident in own organization', () => {
      expect(() => assertCanCloseIncident(adminCtx, mockIncident)).not.toThrow();
    });

    it('Administrator cannot close an incident from another organization', () => {
      expect(() => assertCanCloseIncident(adminCtx, mockOtherOrgIncident)).toThrow(AuthorizationError);
    });

    it('Administrator can delete an incident in own organization', () => {
      expect(() => assertCanDeleteIncident(adminCtx, mockIncident)).not.toThrow();
    });

    it('Administrator cannot delete an incident from another organization', () => {
      expect(() => assertCanDeleteIncident(adminCtx, mockOtherOrgIncident)).toThrow(AuthorizationError);
    });

    it('non-Administrator cannot delete or close', () => {
      const userCtx: AuthContext = { userId: USER_ID, organizationId: ORG_OWN, roles: ['USER'] };
      expect(() => assertCanDeleteIncident(userCtx, mockIncident)).toThrow('Only Administrators can delete incidents.');
      expect(() => assertCanCloseIncident(userCtx, mockIncident)).toThrow('Only Administrators may close incidents.');
    });
  });

  describe('User Rules', () => {
    const mockOwnIncident = { id: 'inc-1', organizationId: ORG_OWN, siteId: SITE_ID, reporterId: USER_ID, status: 'NEW' as IncidentStatus };
    const mockOtherIncident = { id: 'inc-2', organizationId: ORG_OWN, siteId: SITE_ID, reporterId: OTHER_USER_ID, status: 'NEW' as IncidentStatus };
    const userCtx: AuthContext = { userId: USER_ID, organizationId: ORG_OWN, roles: ['USER'] };
    const overlapCtx: AuthContext = { userId: USER_ID, organizationId: ORG_OWN, roles: ['USER', 'RESPONSABLE'] };

    it('User can access their own incident', async () => {
      expect(await canAccessIncident(userCtx, mockOwnIncident, prismaMock)).toBe(true);
    });

    it('User cannot access another user incident', async () => {
      expect(await canAccessIncident(userCtx, mockOtherIncident, prismaMock)).toBe(false);
    });

    it('User + Responsable overlap does not create unintended escalation', async () => {
      // Setup mock where Responsable conditions are NOT met
      vi.mocked(prismaMock.responsableProfile.findUnique).mockResolvedValue(null);
      // But user conditions ARE met
      expect(await canAccessIncident(overlapCtx, mockOwnIncident, prismaMock)).toBe(true);
      // User conditions NOT met, Responsable conditions NOT met
      expect(await canAccessIncident(overlapCtx, mockOtherIncident, prismaMock)).toBe(false);
    });
  });

  describe('Responsable Rules', () => {
    const incidentOnSite = { id: 'inc-1', organizationId: ORG_OWN, siteId: SITE_ID, reporterId: OTHER_USER_ID, status: 'NEW' as IncidentStatus };
    const responsableCtx: AuthContext = { userId: USER_ID, organizationId: ORG_OWN, roles: ['RESPONSABLE'] };
    
    type MockResponsableProfile = ResponsableProfile & { responsableSites: ResponsableSite[] };

    it('Responsable cannot access an unassigned incident', async () => {
      const profile: MockResponsableProfile = {
        id: 'prof-1', userId: USER_ID, organizationId: ORG_OWN, title: null, phone: null, createdAt: new Date(), updatedAt: new Date(),
        responsableSites: [{ id: 'rs-1', responsableProfileId: 'prof-1', siteId: SITE_ID, organizationId: ORG_OWN, isActive: true, createdAt: new Date(), updatedAt: new Date() }]
      };
      vi.mocked(prismaMock.responsableProfile.findUnique).mockResolvedValue(profile);
      vi.mocked(prismaMock.assignment.findMany).mockResolvedValue([]); // Unassigned

      expect(await canAccessIncident(responsableCtx, incidentOnSite, prismaMock)).toBe(false);
    });

    it('Responsable can access an incident actively assigned to them on an authorized active Site', async () => {
      const profile: MockResponsableProfile = {
        id: 'prof-1', userId: USER_ID, organizationId: ORG_OWN, title: null, phone: null, createdAt: new Date(), updatedAt: new Date(),
        responsableSites: [{ id: 'rs-1', responsableProfileId: 'prof-1', siteId: SITE_ID, organizationId: ORG_OWN, isActive: true, createdAt: new Date(), updatedAt: new Date() }]
      };
      vi.mocked(prismaMock.responsableProfile.findUnique).mockResolvedValue(profile);
      
      const assignment: Assignment = { id: 'a-1', incidentId: incidentOnSite.id, responsableProfileId: profile.id, assignedById: 'admin-1', organizationId: ORG_OWN, status: 'ACCEPTED', reason: null, createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(prismaMock.assignment.findMany).mockResolvedValue([assignment]);

      expect(await canAccessIncident(responsableCtx, incidentOnSite, prismaMock)).toBe(true);
    });

    it('Responsable cannot access an incident assigned to another Responsable', async () => {
      const profile: MockResponsableProfile = {
        id: 'prof-1', userId: USER_ID, organizationId: ORG_OWN, title: null, phone: null, createdAt: new Date(), updatedAt: new Date(),
        responsableSites: [{ id: 'rs-1', responsableProfileId: 'prof-1', siteId: SITE_ID, organizationId: ORG_OWN, isActive: true, createdAt: new Date(), updatedAt: new Date() }]
      };
      vi.mocked(prismaMock.responsableProfile.findUnique).mockResolvedValue(profile);
      
      const otherAssignment: Assignment = { id: 'a-1', incidentId: incidentOnSite.id, responsableProfileId: 'prof-OTHER', assignedById: 'admin-1', organizationId: ORG_OWN, status: 'ACCEPTED', reason: null, createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(prismaMock.assignment.findMany).mockImplementation(async (args: { where?: { responsableProfileId?: string } } | undefined) => {
        if (args?.where?.responsableProfileId === 'prof-1') {
          return [];
        }
        return [otherAssignment];
      });

      expect(await canAccessIncident(responsableCtx, incidentOnSite, prismaMock)).toBe(false);
      await expect(assertCanAccessIncident(responsableCtx, incidentOnSite, prismaMock)).rejects.toThrow('Access denied: insufficient permissions for this incident.');
    });

    it('Responsable cannot access an incident on an unauthorized Site', async () => {
      const profile: MockResponsableProfile = {
        id: 'prof-1', userId: USER_ID, organizationId: ORG_OWN, title: null, phone: null, createdAt: new Date(), updatedAt: new Date(),
        responsableSites: [{ id: 'rs-1', responsableProfileId: 'prof-1', siteId: OTHER_SITE_ID, organizationId: ORG_OWN, isActive: true, createdAt: new Date(), updatedAt: new Date() }]
      };
      vi.mocked(prismaMock.responsableProfile.findUnique).mockResolvedValue(profile);
      
      expect(await canAccessIncident(responsableCtx, incidentOnSite, prismaMock)).toBe(false); // incident is on SITE_ID
    });

    it('inactive Site authorization is denied', async () => {
      const profile: MockResponsableProfile = {
        id: 'prof-1', userId: USER_ID, organizationId: ORG_OWN, title: null, phone: null, createdAt: new Date(), updatedAt: new Date(),
        responsableSites: [{ id: 'rs-1', responsableProfileId: 'prof-1', siteId: SITE_ID, organizationId: ORG_OWN, isActive: false, createdAt: new Date(), updatedAt: new Date() }]
      };
      vi.mocked(prismaMock.responsableProfile.findUnique).mockResolvedValue(profile);
      
      expect(await canAccessIncident(responsableCtx, incidentOnSite, prismaMock)).toBe(false);
    });

    it('inactive Responsable profile is denied', async () => {
      vi.mocked(prismaMock.responsableProfile.findUnique).mockResolvedValue(null);
      expect(await canAccessIncident(responsableCtx, incidentOnSite, prismaMock)).toBe(false);
    });

    it('cross-organization Responsable access is denied', async () => {
      const otherOrgIncident = { id: 'inc-2', organizationId: ORG_OTHER, siteId: SITE_ID, reporterId: OTHER_USER_ID, status: 'NEW' as IncidentStatus };
      expect(await canAccessIncident(responsableCtx, otherOrgIncident, prismaMock)).toBe(false);
    });
  });

  describe('Immutability / Mutation Boundaries', () => {
    it('original report fields cannot be modified', () => {
      expect(() => assertOriginalReportImmutable({ originalTitle: 'changed' })).toThrow('Cannot modify the original submitted incident report.');
      expect(() => assertOriginalReportImmutable({ originalSeverity: 'HIGH' })).toThrow(AuthorizationError);
      expect(() => assertOriginalReportImmutable({ priority: 1 })).not.toThrow();
    });
  });
});
