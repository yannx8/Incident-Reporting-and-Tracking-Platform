import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { PrismaClient, User, OrgRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('@prisma/client', () => {
  const mPrismaClient = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    organization: {
      findUnique: vi.fn()
    },
    organizationInvitation: {
      findUnique: vi.fn()
    },
    organizationMembership: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    auditEvent: {
      create: vi.fn()
    }
  };
  return { 
    PrismaClient: vi.fn(() => mPrismaClient),
    OrgRole: { ADMINISTRATOR: 'ADMINISTRATOR', USER: 'USER', RESPONSABLE: 'RESPONSABLE' }
  };
});

const prisma = new PrismaClient();
process.env.JWT_SECRET = 'fallback-secret-for-development';
const secret = process.env.JWT_SECRET;
const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';

describe('Authentication API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('registers a user and returns 201 with verificationToken', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      
      const mockInvitation = {
        id: 'inv-1',
        code: 'VALID_CODE',
        organizationId: mockOrgId,
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date()
      };
      // @ts-expect-error - mock
      vi.mocked(prisma.organizationInvitation.findUnique).mockResolvedValue(mockInvitation);
      
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [{ id: 'm-1', organizationId: mockOrgId, role: 'USER' as OrgRole, isActive: false, userId: 'u-1', createdAt: new Date(), updatedAt: new Date() }]
      };
      
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as unknown as User);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test User',
          joinCode: 'VALID_CODE'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.verificationToken).toBeDefined();
    });

    it('returns 409 if user exists', async () => {
      const mockExisting: User = { id: 'u-1', email: 'test@example.com', displayName: 'Test', passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockExisting);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test User',
          joinCode: 'VALID_CODE'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/exists/);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in and returns cookie', async () => {
      const hash = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [{
          id: 'm-1', organizationId: mockOrgId, role: 'USER' as OrgRole, isActive: true, userId: 'u-1', createdAt: new Date(), updatedAt: new Date()
        }]
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as unknown as User);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'][0]).toMatch(/token=.*\s*HttpOnly/);
    });

    it('returns 403 for unverified user (no active memberships)', async () => {
      const hash = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [{
          id: 'm-1', organizationId: mockOrgId, role: 'USER' as OrgRole, isActive: false, userId: 'u-1', createdAt: new Date(), updatedAt: new Date()
        }]
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as unknown as User);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(403);
    });

    it('returns 401 for bad password', async () => {
      const hash = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: []
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as unknown as User);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user if authenticated', async () => {
      const token = jwt.sign({ userId: 'u-1' }, secret);
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: []
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as unknown as User);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
    });

    it('returns 401 if no token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('verifies a valid token', async () => {
      const token = jwt.sign({ membershipId: 'm-1' }, secret);
      const mockMembership = {
        id: 'm-1',
        userId: 'u-1',
        organizationId: mockOrgId,
        role: 'USER',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // @ts-expect-error - mock
      vi.mocked(prisma.organizationMembership.findUnique).mockResolvedValue(mockMembership);
      
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ token });

      expect(res.status).toBe(200);
      expect(prisma.organizationMembership.update).toHaveBeenCalled();
      expect(prisma.auditEvent.create).toHaveBeenCalled();
    });

    it('returns 401 for invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'][0]).toMatch(/token=;/);
    });
  });
});
