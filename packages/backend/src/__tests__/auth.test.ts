import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { PrismaClient, User, Organization, OrgRole } from '@prisma/client';
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
    }
  };
  return { PrismaClient: vi.fn(() => mPrismaClient) };
});

const prisma = new PrismaClient();
const secret = 'fallback-secret-for-development';
const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';

describe('Authentication API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('registers a user and returns 201 with cookie', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const mockOrg: Organization = { id: mockOrgId, name: 'Org 1', slug: 'org-1', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg);
      
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
          organizationId: mockOrgId
        });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.headers['set-cookie'][0]).toMatch(/token=.*\s*HttpOnly/);
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
          organizationId: mockOrgId
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
        memberships: []
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

  describe('POST /api/auth/logout', () => {
    it('clears cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'][0]).toMatch(/token=;/);
    });
  });
});
