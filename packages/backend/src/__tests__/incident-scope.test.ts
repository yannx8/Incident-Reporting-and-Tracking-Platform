import { describe, it, expect } from 'vitest';

function incidentScope(a: any) {
  if (a.roles.includes('ADMINISTRATOR')) return { organizationId: a.organizationId };
  if (a.roles.includes('RESPONSABLE'))
    return {
      organizationId: a.organizationId,
      assignments: { some: { responsable: { userId: a.userId } } }
    };
  return { organizationId: a.organizationId, reporterId: a.userId };
}

describe('incident scope', () => {
  it('admin sees all incidents in organization', () => {
    const auth = { roles: ['ADMINISTRATOR'], organizationId: 'org-1', userId: 'user-1' };
    const scope = incidentScope(auth);
    expect(scope).toEqual({ organizationId: 'org-1' });
  });

  it('responsable sees incidents with any assignment (active or historical)', () => {
    const auth = { roles: ['RESPONSABLE'], organizationId: 'org-1', userId: 'user-1' };
    const scope = incidentScope(auth);
    expect(scope).toEqual({
      organizationId: 'org-1',
      assignments: { some: { responsable: { userId: 'user-1' } } }
    });
  });

  it('regular user sees only own reported incidents', () => {
    const auth = { roles: ['USER'], organizationId: 'org-1', userId: 'user-1' };
    const scope = incidentScope(auth);
    expect(scope).toEqual({ organizationId: 'org-1', reporterId: 'user-1' });
  });

  it('user with overlapping roles gets first matching role scope', () => {
    const auth = { roles: ['USER', 'RESPONSABLE'], organizationId: 'org-1', userId: 'user-1' };
    const scope = incidentScope(auth);
    expect(scope).toEqual({
      organizationId: 'org-1',
      assignments: { some: { responsable: { userId: 'user-1' } } }
    });
  });
});
