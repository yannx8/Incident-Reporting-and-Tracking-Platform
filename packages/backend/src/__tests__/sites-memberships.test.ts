import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Sites & Memberships API', () => {
  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;
  let organizationId: string;
  let siteId: string;

  beforeAll(async () => {
    organizationId = crypto.randomUUID();
    adminId = crypto.randomUUID();
    userId = crypto.randomUUID();

    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Test Org',
        slug: `test-org-${crypto.randomUUID().substring(0, 8)}`,
      }
    });

    await prisma.user.createMany({
      data: [
        { id: adminId, email: `admin-${crypto.randomUUID()}@test.com`, displayName: 'Admin', passwordHash: 'hash' },
        { id: userId, email: `user-${crypto.randomUUID()}@test.com`, displayName: 'User', passwordHash: 'hash' }
      ]
    });

    await prisma.organizationMembership.createMany({
      data: [
        { userId: adminId, organizationId, role: 'ADMINISTRATOR', isActive: true },
        { userId: userId, organizationId, role: 'USER', isActive: true }
      ]
    });

    adminToken = jwt.sign({ userId: adminId }, JWT_SECRET);
    userToken = jwt.sign({ userId }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.responsableSite.deleteMany({ where: { organizationId } });
    await prisma.site.deleteMany({ where: { organizationId } });
    await prisma.responsableProfile.deleteMany({ where: { organizationId } });
    await prisma.organizationMembership.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, userId] } } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  describe('Sites API', () => {
    it('should deny site creation to non-administrators', async () => {
      const res = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'User Site' });

      expect(res.status).toBe(403);
    });

    it('should allow administrator to create a site', async () => {
      const res = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Admin Site', address: '123 Test St' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Admin Site');
      expect(res.body.address).toBe('123 Test St');
      siteId = res.body.id;
    });

    it('should list active sites', async () => {
      const res = await request(app)
        .get('/api/sites?activeOnly=true')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-organization-id', organizationId);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(siteId);
    });
  });

  describe('Memberships API', () => {
    it('should deny role assignment to non-administrators', async () => {
      const res = await request(app)
        .post('/api/memberships')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-organization-id', organizationId)
        .send({ userId, role: 'RESPONSABLE' });

      expect(res.status).toBe(403);
    });

    it('should allow administrator to assign RESPONSABLE role and create profile', async () => {
      const res = await request(app)
        .post('/api/memberships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', organizationId)
        .send({ userId, role: 'RESPONSABLE' });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('RESPONSABLE');

      // Verify profile was created
      const profile = await prisma.responsableProfile.findUnique({
        where: { userId_organizationId: { userId, organizationId } }
      });
      expect(profile).not.toBeNull();
      expect(profile?.title).toBe('Responsable');
      
      // Assign site to responsable
      const assignRes = await request(app)
        .post(`/api/memberships/${profile!.id}/sites`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', organizationId)
        .send({ siteId });

      expect(assignRes.status).toBe(201);
      expect(assignRes.body.isActive).toBe(true);
    });
  });
});
