import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Incidents API - Advanced Endpoints', () => {
  let testUser: any;
  let testResponsable: any;
  let testAdmin: any;
  let testOrg: any;
  let testSite: any;
  let testIncident: any;
  let testAssignment: any;
  let testProfile: any;

  let userToken: string;
  let responsableToken: string;
  let adminToken: string;

  beforeAll(async () => {
    testOrg = await prisma.organization.create({
      data: { name: 'Adv Org', slug: `adv-org-${Date.now()}` }
    });

    testSite = await prisma.site.create({
      data: { organizationId: testOrg.id, name: 'Adv Site', isActive: true }
    });

    // User
    testUser = await prisma.user.create({
      data: { email: `user-${Date.now()}@test.com`, displayName: 'User', passwordHash: 'hash' }
    });
    await prisma.organizationMembership.create({
      data: { userId: testUser.id, organizationId: testOrg.id, role: 'USER' }
    });
    userToken = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET || 'test-secret');

    // Admin
    testAdmin = await prisma.user.create({
      data: { email: `admin-${Date.now()}@test.com`, displayName: 'Admin', passwordHash: 'hash' }
    });
    await prisma.organizationMembership.create({
      data: { userId: testAdmin.id, organizationId: testOrg.id, role: 'ADMINISTRATOR' }
    });
    adminToken = jwt.sign({ userId: testAdmin.id }, process.env.JWT_SECRET || 'test-secret');

    // Responsable
    testResponsable = await prisma.user.create({
      data: { email: `resp-${Date.now()}@test.com`, displayName: 'Resp', passwordHash: 'hash' }
    });
    await prisma.organizationMembership.create({
      data: { userId: testResponsable.id, organizationId: testOrg.id, role: 'RESPONSABLE' }
    });
    testProfile = await prisma.responsableProfile.create({
      data: { userId: testResponsable.id, organizationId: testOrg.id }
    });
    await prisma.responsableSite.create({
      data: { responsableProfileId: testProfile.id, siteId: testSite.id, organizationId: testOrg.id }
    });
    responsableToken = jwt.sign({ userId: testResponsable.id }, process.env.JWT_SECRET || 'test-secret');

    // Incident
    testIncident = await prisma.incident.create({
      data: {
        organizationId: testOrg.id,
        siteId: testSite.id,
        reporterId: testUser.id,
        status: 'NEW',
        severity: 'MEDIUM',
        category: 'SAFETY',
        title: 'Safety Issue',
        description: 'Need help',
        originalTitle: 'Safety Issue',
        originalDescription: 'Need help',
        originalCategory: 'SAFETY',
        originalSeverity: 'MEDIUM',
        originalReportedAt: new Date()
      }
    });

    // Assignment
    testAssignment = await prisma.assignment.create({
      data: {
        incidentId: testIncident.id,
        responsableProfileId: testProfile.id,
        assignedById: testAdmin.id,
        organizationId: testOrg.id,
        status: 'PENDING'
      }
    });
  });

  afterAll(async () => {
    await prisma.progressUpdate.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.auditEvent.deleteMany({});
    await prisma.assignment.deleteMany({});
    await prisma.incident.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.responsableSite.deleteMany({});
    await prisma.responsableProfile.deleteMany({});
    await prisma.site.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.organizationMembership.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.user.deleteMany({ where: { id: { in: [testUser.id, testAdmin.id, testResponsable.id] } } });
    await prisma.organization.delete({ where: { id: testOrg.id } });
    await prisma.$disconnect();
  });

  describe('updateAssignmentStatus', () => {
    it('should allow responsable to accept assignment', async () => {
      const res = await request(app)
        .patch(`/api/incidents/${testIncident.id}/assignments/${testAssignment.id}/status`)
        .set('Authorization', `Bearer ${responsableToken}`)
        .set('x-organization-id', testOrg.id)
        .send({ status: 'ACCEPTED' });

      expect(res.status).toBe(200);

      const incident = await prisma.incident.findUnique({ where: { id: testIncident.id } });
      expect(incident?.status).toBe('IN_PROGRESS');

      const assignment = await prisma.assignment.findUnique({ where: { id: testAssignment.id } });
      expect(assignment?.status).toBe('ACCEPTED');
    });

    it('should reject accepting if not assigned user', async () => {
      const res = await request(app)
        .patch(`/api/incidents/${testIncident.id}/assignments/${testAssignment.id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-organization-id', testOrg.id)
        .send({ status: 'ACCEPTED' });

      expect(res.status).toBe(403);
    });
  });

  describe('createProgressUpdate', () => {
    it('should allow assigned responsable to post progress update', async () => {
      const res = await request(app)
        .post(`/api/incidents/${testIncident.id}/progress-updates`)
        .set('Authorization', `Bearer ${responsableToken}`)
        .set('x-organization-id', testOrg.id)
        .send({ type: 'PROGRESS', content: 'Working on it' });

      expect(res.status).toBe(201);
      expect(res.body.progressUpdate.content).toBe('Working on it');
    });

    it('should block unassigned user from posting progress update', async () => {
      const res = await request(app)
        .post(`/api/incidents/${testIncident.id}/progress-updates`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-organization-id', testOrg.id)
        .send({ type: 'PROGRESS', content: 'Working on it' });

      expect(res.status).toBe(403);
    });
  });

  describe('addComment', () => {
    it('should allow reporter to comment', async () => {
      const res = await request(app)
        .post(`/api/incidents/${testIncident.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-organization-id', testOrg.id)
        .send({ body: 'Any updates?' });

      expect(res.status).toBe(201);
      expect(res.body.comment.body).toBe('Any updates?');
    });

    it('should allow assigned responsable to comment', async () => {
      const res = await request(app)
        .post(`/api/incidents/${testIncident.id}/comments`)
        .set('Authorization', `Bearer ${responsableToken}`)
        .set('x-organization-id', testOrg.id)
        .send({ body: 'Yes, looking good.' });

      expect(res.status).toBe(201);
    });
  });

  describe('resolveIncident', () => {
    it('should block non-responsable from resolving', async () => {
      const res = await request(app)
        .post(`/api/incidents/${testIncident.id}/resolve`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-organization-id', testOrg.id);

      expect(res.status).toBe(403);
    });

    it('should allow assigned responsable to resolve', async () => {
      const res = await request(app)
        .post(`/api/incidents/${testIncident.id}/resolve`)
        .set('Authorization', `Bearer ${responsableToken}`)
        .set('x-organization-id', testOrg.id);

      expect(res.status).toBe(200);

      const incident = await prisma.incident.findUnique({ where: { id: testIncident.id } });
      expect(incident?.status).toBe('RESOLVED');
    });
  });

  describe('closeIncident', () => {
    it('should block responsable from closing', async () => {
      const res = await request(app)
        .post(`/api/incidents/${testIncident.id}/close`)
        .set('Authorization', `Bearer ${responsableToken}`)
        .set('x-organization-id', testOrg.id);

      expect(res.status).toBe(403);
    });

    it('should allow admin to close', async () => {
      const res = await request(app)
        .post(`/api/incidents/${testIncident.id}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id);

      expect(res.status).toBe(200);

      const incident = await prisma.incident.findUnique({ where: { id: testIncident.id } });
      expect(incident?.status).toBe('CLOSED');
    });
  });

  describe('listIncidents with Advanced Filters', () => {
    it('should filter by search across title and description', async () => {
      const res = await request(app)
        .get(`/api/incidents?search=safety`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id);

      expect(res.status).toBe(200);
      expect(res.body.incidents.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by assignedToMe for responsable', async () => {
      const res = await request(app)
        .get(`/api/incidents?assignedToMe=true`)
        .set('Authorization', `Bearer ${responsableToken}`)
        .set('x-organization-id', testOrg.id);

      expect(res.status).toBe(200);
      // Because we already created and accepted an assignment for this responsable
      expect(res.body.incidents.length).toBeGreaterThanOrEqual(1);
    });
  });
});
