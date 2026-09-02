import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient, OrgRole, Incident, IncidentStatus, IncidentSeverity } from '@prisma/client';
import {
  buildAuthContext,
  canAccessIncident,
  assertCanReadIncident,
  assertCanUpdateIncident,
  assertCanDeleteIncident,
  checkOrganizationOwnership,
  hasRole,
  AuthorizationError,
  AuthContext
} from '../authz/index.js';

describe('Authorization Boundary', () => {
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

  const mockOrgId = 'org-1';
  const otherOrgId = 'org-2';
  const mockUserId = 'user-1';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication & Membership', () => {
    it('buildAuthContext fails for inactive/non-member access', async () => {
      // Simulate no active memberships
      vi.mocked(prismaMock.organizationMembership.findMany).mockResolvedValue([]);
      
      await expect(buildAuthContext(mockUserId, mockOrgId, prismaMock))
        .rejects.toThrow(AuthorizationError);
      await expect(buildAuthContext(mockUserId, mockOrgId, prismaMock))
        .rejects.toThrow('User is not an active member of this organization.');
    });

    it('buildAuthContext succeeds for active member and populates roles', async () => {
      vi.mocked(prismaMock.organizationMembership.findMany).mockResolvedValue([
        { id: '1', userId: mockUserId, organizationId: mockOrgId, role: 'USER', isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: mockUserId, organizationId: mockOrgId, role: 'RESPONSABLE', isActive: true, createdAt: new Date(), updatedAt: new Date() }
      ]);
      
      const ctx = await buildAuthContext(mockUserId, mockOrgId, prismaMock);
      expect(ctx.userId).toBe(mockUserId);
      expect(ctx.organizationId).toBe(mockOrgId);
      expect(ctx.roles).toContain('USER');
      expect(ctx.roles).toContain('RESPONSABLE');
    });
  });

  describe('Organization Boundaries', () => {
    it('cross-organization access rejected', () => {
      const ctx: AuthContext = { userId: mockUserId, organizationId: mockOrgId, roles: ['USER'] };
      expect(() => checkOrganizationOwnership(ctx, otherOrgId)).toThrow(AuthorizationError);
    });
  });

  describe('Incident Access Rules', () => {
    const mockIncident = {
      id: 'inc-1',
      organizationId: mockOrgId,
      siteId: 'site-1',
      reporterId: 'reporter-1',
      status: 'NEW' as IncidentStatus,
    };

    it('ADMINISTRATOR allowed within own organization', async () => {
      const ctx: AuthContext = { userId: mockUserId, organizationId: mockOrgId, roles: ['ADMINISTRATOR'] };
      const canAccess = await canAccessIncident(ctx, mockIncident, prismaMock);
      expect(canAccess).toBe(true);
    });

    it('ADMINISTRATOR cross-organization access rejected', async () => {
      const ctx: AuthContext = { userId: mockUserId, organizationId: otherOrgId, roles: ['ADMINISTRATOR'] };
      const canAccess = await canAccessIncident(ctx, mockIncident, prismaMock);
      expect(canAccess).toBe(false);
    });

    it('USER allowed to access their own incidents', async () => {
      const ctx: AuthContext = { userId: 'reporter-1', organizationId: mockOrgId, roles: ['USER'] };
      const canAccess = await canAccessIncident(ctx, mockIncident, prismaMock);
      expect(canAccess).toBe(true);
    });

    it('USER denied access to other users incidents', async () => {
      const ctx: AuthContext = { userId: 'reporter-2', organizationId: mockOrgId, roles: ['USER'] };
      const canAccess = await canAccessIncident(ctx, mockIncident, prismaMock);
      expect(canAccess).toBe(false);
    });

    it('RESPONSABLE allowed to access unassigned incident on authorized Site', async () => {
      const ctx: AuthContext = { userId: mockUserId, organizationId: mockOrgId, roles: ['RESPONSABLE'] };
      
      vi.mocked(prismaMock.responsableProfile.findUnique).mockResolvedValue({
        id: 'profile-1',
        userId: mockUserId,
        organizationId: mockOrgId,
        title: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        responsableSites: [
          { id: 'rs-1', responsableProfileId: 'profile-1', siteId: 'site-1', organizationId: mockOrgId, isActive: true, createdAt: new Date(), updatedAt: new Date() }
        ]
      } as any);
      
      vi.mocked(prismaMock.assignment.findMany).mockResolvedValue([]);

      const canAccess = await canAccessIncident(ctx, mockIncident, prismaMock);
      expect(canAccess).toBe(true);
    });

    it('RESPONSABLE cannot operate on unauthorized Site', async () => {
      const ctx: AuthContext = { userId: mockUserId, organizationId: mockOrgId, roles: ['RESPONSABLE'] };
      
      vi.mocked(prismaMock.responsableProfile.findUnique).mockResolvedValue({
        id: 'profile-1',
        userId: mockUserId,
        organizationId: mockOrgId,
        title: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        responsableSites: [
          { id: 'rs-1', responsableProfileId: 'profile-1', siteId: 'site-2', organizationId: mockOrgId, isActive: true, createdAt: new Date(), updatedAt: new Date() }
        ]
      } as any);

      const canAccess = await canAccessIncident(ctx, mockIncident, prismaMock);
      expect(canAccess).toBe(false); // Incident is on site-1
    });

    it('Responsable cannot access another Responsable assigned incident', async () => {
      const ctx: AuthContext = { userId: mockUserId, organizationId: mockOrgId, roles: ['RESPONSABLE'] };
      
      vi.mocked(prismaMock.responsableProfile.findUnique).mockResolvedValue({
        id: 'profile-1',
        userId: mockUserId,
        organizationId: mockOrgId,
        title: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        responsableSites: [
          { id: 'rs-1', responsableProfileId: 'profile-1', siteId: 'site-1', organizationId: mockOrgId, isActive: true, createdAt: new Date(), updatedAt: new Date() }
        ]
      } as any);

      vi.mocked(prismaMock.assignment.findMany).mockResolvedValue([
        { id: 'a-1', incidentId: 'inc-1', responsableProfileId: 'profile-OTHER', assignedById: 'admin-1', organizationId: mockOrgId, status: 'ACCEPTED', reason: null, createdAt: new Date(), updatedAt: new Date() }
      ]);

      const canAccess = await canAccessIncident(ctx, mockIncident, prismaMock);
      expect(canAccess).toBe(false);
    });

    it('USER + RESPONSABLE overlap works (can access as reporter even if assigned to other responsable)', async () => {
      const ctx: AuthContext = { userId: 'reporter-1', organizationId: mockOrgId, roles: ['USER', 'RESPONSABLE'] };
      
      // Being a reporter is enough to access it
      const canAccess = await canAccessIncident(ctx, mockIncident, prismaMock);
      expect(canAccess).toBe(true);
    });
  });

  describe('Incident Modification Rules', () => {
    const mockIncident = {
      id: 'inc-1',
      organizationId: mockOrgId,
      siteId: 'site-1',
      reporterId: 'reporter-1',
      status: 'NEW' as IncidentStatus,
    };

    it('User cannot modify/delete the original submitted incident (title)', async () => {
      const ctx: AuthContext = { userId: 'reporter-1', organizationId: mockOrgId, roles: ['USER'] };
      
      const payload = { originalTitle: 'Modified title' };
      
      await expect(assertCanUpdateIncident(ctx, mockIncident, payload, prismaMock))
        .rejects.toThrow('Cannot modify the original submitted incident report.');
    });

    it('non-Administrator cannot close an incident', async () => {
      const ctx: AuthContext = { userId: 'reporter-1', organizationId: mockOrgId, roles: ['USER'] };
      
      const payload = { status: 'CLOSED' as IncidentStatus };
      
      await expect(assertCanUpdateIncident(ctx, mockIncident, payload, prismaMock))
        .rejects.toThrow('Only Administrators may close incidents.');
    });

    it('Administrator can close an incident', async () => {
      const ctx: AuthContext = { userId: 'admin-1', organizationId: mockOrgId, roles: ['ADMINISTRATOR'] };
      
      const payload = { status: 'CLOSED' as IncidentStatus };
      
      await expect(assertCanUpdateIncident(ctx, mockIncident, payload, prismaMock)).resolves.not.toThrow();
    });

    it('Administrator can perform organization-scoped administrative actions (delete)', () => {
      const ctx: AuthContext = { userId: 'admin-1', organizationId: mockOrgId, roles: ['ADMINISTRATOR'] };
      expect(() => assertCanDeleteIncident(ctx)).not.toThrow();
    });

    it('Non-Administrator cannot delete', () => {
      const ctx: AuthContext = { userId: 'reporter-1', organizationId: mockOrgId, roles: ['USER'] };
      expect(() => assertCanDeleteIncident(ctx)).toThrow('Only Administrators can delete incidents.');
    });
  });
});
