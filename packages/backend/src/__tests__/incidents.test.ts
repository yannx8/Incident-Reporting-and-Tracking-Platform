import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Incidents API', () => {
  let testUser: any;
  let testOrg: any;
  let testSite: any;
  let authToken: string;

  beforeAll(async () => {
    // 1. Create Organization
    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Org for Incidents',
        slug: `test-org-incidents-${Date.now()}`
      }
    });

    // 2. Create User
    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@incidents.com`,
        displayName: 'Test Reporter',
        passwordHash: 'dummy_hash',
      }
    });

    // 3. Create Org Membership (USER role)
    await prisma.organizationMembership.create({
      data: {
        userId: testUser.id,
        organizationId: testOrg.id,
        role: 'USER',
        isActive: true
      }
    });

    // 4. Create Site (Prisma seed fixture for Site as requested)
    testSite = await prisma.site.create({
      data: {
        organizationId: testOrg.id,
        name: `Test Site ${Date.now()}`,
        isActive: true,
      }
    });

    // 5. Generate Auth Token
    process.env.JWT_SECRET = 'test-secret';
    authToken = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.auditEvent.deleteMany({ where: { actorId: testUser.id } });
    await prisma.incident.deleteMany({ where: { reporterId: testUser.id } });
    await prisma.site.delete({ where: { id: testSite.id } });
    await prisma.organizationMembership.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.organization.delete({ where: { id: testOrg.id } });
    await prisma.$disconnect();
  });

  it('should create an incident successfully', async () => {
    const payload = {
      siteId: testSite.id,
      title: 'Water Leak',
      description: 'Major water leak in the lobby',
      category: 'PLUMBING',
      severity: 'HIGH'
    };

    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-organization-id', testOrg.id)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.incident).toBeDefined();
    expect(response.body.incident.title).toBe(payload.title);
    expect(response.body.incident.severity).toBe(payload.severity);
    expect(response.body.incident.status).toBe('NEW');
    
    // Verify it was actually saved in DB
    const savedIncident = await prisma.incident.findUnique({
      where: { id: response.body.incident.id }
    });
    expect(savedIncident).toBeDefined();
    expect(savedIncident?.originalTitle).toBe(payload.title);
  });

  it('should reject incident creation with invalid siteId', async () => {
    const payload = {
      siteId: testUser.id, // Random UUID that is not a site
      title: 'Water Leak',
      description: 'Major water leak in the lobby',
      category: 'PLUMBING',
      severity: 'HIGH'
    };

    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-organization-id', testOrg.id)
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Site not found');
  });

  it('should reject incident creation for a site from another organization', async () => {
    // Create another organization and site
    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Other Org',
        slug: `other-org-${Date.now()}`
      }
    });

    const otherSite = await prisma.site.create({
      data: {
        organizationId: otherOrg.id,
        name: `Other Site ${Date.now()}`,
        isActive: true,
      }
    });

    const payload = {
      siteId: otherSite.id,
      title: 'Water Leak',
      description: 'Major water leak in the lobby',
      category: 'PLUMBING',
      severity: 'HIGH'
    };

    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-organization-id', testOrg.id)
      .send(payload);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Site does not belong to your organization');

    // Cleanup other org
    await prisma.site.delete({ where: { id: otherSite.id } });
    await prisma.organization.delete({ where: { id: otherOrg.id } });
  });

  it('should list incidents for the organization', async () => {
    const response = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-organization-id', testOrg.id);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.incidents)).toBe(true);
    expect(response.body.incidents.length).toBeGreaterThanOrEqual(1);
    expect(response.body.incidents[0].title).toBe('Water Leak');
  });
});
