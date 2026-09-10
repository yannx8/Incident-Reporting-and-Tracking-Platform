import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import multer from 'multer';
import path from 'node:path';
import { env } from './env.js';
import { prisma } from './lib/prisma.js';
import { AppError } from './lib/errors.js';
import { authenticate } from './middleware/authenticate.js';
import { requireRole } from './middleware/requireRole.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter, loginLimiter } from './lib/rateLimiter.js';
import { createIncident, comment, resolution, reject } from './modules/incidents/incidents.schema.js';
import { assertTransition } from './modules/incidents/incident-lifecycle.js';
import { saveFile, readFile, contentType, hashToken } from './lib/storage.js';
import { classifyIncident } from './modules/ai/classifier.js';

const app = express();
app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(self),camera=(),microphone=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"
  );
  next();
});

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id']
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(apiLimiter);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const tok = (userId: string, organizationId: string, sessionId: string, secret: string, expiresIn: string) =>
  jwt.sign({ userId, organizationId, sessionId }, secret, { expiresIn } as any);
const refreshCookie = 'nexus_refresh';

function setRefreshCookie(res: any, token: string, ttlDays?: number) {
  const days = ttlDays ?? env.REFRESH_TOKEN_TTL_DAYS;
  res.setHeader(
    'Set-Cookie',
    `${refreshCookie}=${encodeURIComponent(token)}; HttpOnly; Path=/auth; SameSite=Lax; Max-Age=${
      days * 86400
    }${env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
}

function clearRefreshCookie(res: any) {
  res.setHeader(
    'Set-Cookie',
    `${refreshCookie}=; HttpOnly; Path=/auth; SameSite=Lax; Max-Age=0${
      env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  );
}

function cookie(req: any, name: string) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

async function ctx(req: any) {
  if (!req.auth) throw new AppError('AUTH_REQUIRED', 401, 'Authentication required');
  return req.auth;
}

function audit(tx: any, incidentId: string | undefined, actorId: string, eventType: string, payload: any) {
  return tx.auditEvent.create({ data: { incidentId, actorId, eventType, payload } });
}

async function deliverEmail(type: 'verification' | 'reset', to: string, token: string) {
  const endpoint = process.env.EMAIL_WEBHOOK_URL;
  if (!endpoint) {
    if (env.NODE_ENV === 'production') throw new AppError('EMAIL_NOT_CONFIGURED', 503, 'Email delivery is not configured');
    console.info(`[development] ${type} token for ${to}: ${token}`);
    return;
  }
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-nexus-event': type },
    body: JSON.stringify({
      type,
      to,
      token,
      verificationUrl: `${env.WEB_ORIGIN}/verify?code=${encodeURIComponent(token)}`,
      resetUrl: `${env.WEB_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`
    })
  });
  if (!r.ok) throw new AppError('EMAIL_DELIVERY_FAILED', 503, 'Unable to deliver email');
}

app.get('/health', (_q, res) => res.json({ status: 'ok', service: 'nexus-incidents' }));
app.get('/ready', async (_q, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch (e) {
    next(new AppError('NOT_READY', 503, 'Database unavailable'));
  }
});

app.post('/auth/register', async (req, res, next) => {
  try {
    const body = req.body as any;
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const organizationSlug = String(body.organizationSlug || '').trim().toLowerCase();
    if (
      name.length < 2 ||
      name.length > 120 ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
      password.length < 12 ||
      password.length > 128 ||
      !organizationSlug
    )
      throw new AppError('VALIDATION_ERROR', 400, 'Valid name, email, 12+ character password and organizationSlug are required');
    const org = await prisma.organization.findUnique({ where: { slug: organizationSlug } });
    if (!org) throw new AppError('NOT_FOUND', 404, 'Organization not found');
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new AppError('CONFLICT_STATE', 409, 'Email already registered');
    const code = crypto.randomBytes(24).toString('hex');
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        verificationToken: crypto.createHash('sha256').update(code).digest('hex'),
        verificationExpiry: new Date(Date.now() + 15 * 60e3),
        memberships: { create: { organizationId: org.id, roles: ['USER'] } }
      }
    });
    try {
      await deliverEmail('verification', email, code);
    } catch (e) {
      await prisma.user.delete({ where: { id: user.id } });
      throw e;
    }
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isVerified: false,
        organizationId: org.id,
        organizationName: org.name
      },
      verificationRequired: true,
      ...(env.NODE_ENV !== 'production' ? { verificationCode: code } : {})
    });
  } catch (e) {
    next(e);
  }
});

app.post('/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const organizationId = req.body.organizationId ? String(req.body.organizationId) : undefined;
    const rememberMe = req.body.rememberMe === true;
    const refreshTtlDays = rememberMe ? 30 : env.REFRESH_TOKEN_TTL_DAYS;
    const u = await prisma.user.findUnique({
      where: { email },
      include: { memberships: { include: { organization: true } } }
    });
    if (!u || !(await bcrypt.compare(password, u.passwordHash)))
      throw new AppError('AUTH_INVALID', 401, 'Invalid credentials');
    const active = u.memberships.filter((x: any) => x.status === 'ACTIVE');
    if (!active.length) throw new AppError('FORBIDDEN', 403, 'Membership inactive');
    const m = organizationId
      ? active.find((x: any) => x.organizationId === organizationId)
      : active.length === 1
      ? active[0]
      : undefined;
    if (!m) {
      res.status(409).json({
        error: {
          code: 'ORGANIZATION_SELECTION_REQUIRED',
          message: 'Select an organization',
          organizations: active.map((x: any) => ({
            id: x.organizationId,
            name: x.organization.name,
            roles: x.roles
          }))
        }
      });
      return;
    }
    const sessionId = crypto.randomUUID();
    const refresh = tok(
      u.id,
      m.organizationId,
      sessionId,
      env.JWT_REFRESH_SECRET,
      `${refreshTtlDays}d`
    );
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: u.id,
        organizationId: m.organizationId,
        tokenHash: hashToken(refresh),
        expiresAt: new Date(Date.now() + refreshTtlDays * 86400e3)
      }
    });
    setRefreshCookie(res, refresh, refreshTtlDays);
    res.json({
      accessToken: tok(u.id, m.organizationId, sessionId, env.JWT_SECRET, env.ACCESS_TOKEN_TTL),
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        isVerified: u.isVerified,
        roles: m.roles,
        organizationId: m.organizationId,
        organizationName: m.organization.name
      }
    });
  } catch (e) {
    next(e);
  }
});

app.get('/organizations', async (_req, res, next) => {
  try {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' }
    });
    res.json(orgs);
  } catch (e) {
    next(e);
  }
});

app.use(authenticate);

app.get('/auth/me', async (req, res, next) => {
  try {
    const a = await ctx(req);
    const u = await prisma.user.findUnique({
      where: { id: a.userId },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        memberships: {
          where: { organizationId: a.organizationId, status: 'ACTIVE' },
          include: { organization: true }
        }
      }
    });
    if (!u) throw new AppError('AUTH_INVALID', 401, 'User not found');
    const m = u.memberships[0];
    res.json({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        isVerified: u.isVerified,
        organizationId: a.organizationId,
        organizationName: m.organization.name,
        roles: m.roles
      }
    });
  } catch (e) {
    next(e);
  }
});

app.patch('/auth/me', async (req, res, next) => {
  try {
    const a = await ctx(req);
    const name = String(req.body.name || '').trim();
    if (name.length < 2 || name.length > 120)
      throw new AppError('VALIDATION_ERROR', 400, 'Name must be 2-120 characters');
    const u = await prisma.user.update({
      where: { id: a.userId },
      data: { name },
      select: { id: true, name: true, email: true }
    });
    res.json(u);
  } catch (e) {
    next(e);
  }
});

app.post('/auth/refresh', async (req, res, next) => {
  try {
    const refresh = cookie(req, refreshCookie);
    if (!refresh) throw new AppError('AUTH_INVALID', 401, 'Refresh session missing');
    const p = jwt.verify(refresh, env.JWT_REFRESH_SECRET) as any;
    const session = await prisma.session.findFirst({
      where: {
        id: p.sessionId,
        userId: p.userId,
        organizationId: p.organizationId,
        tokenHash: hashToken(refresh),
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });
    if (!session) throw new AppError('AUTH_INVALID', 401, 'Refresh session expired or revoked');
    const nextRefresh = tok(
      p.userId,
      p.organizationId,
      p.sessionId,
      env.JWT_REFRESH_SECRET,
      `${env.REFRESH_TOKEN_TTL_DAYS}d`
    );
    await prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash: hashToken(nextRefresh),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400e3)
      }
    });
    setRefreshCookie(res, nextRefresh);
    res.json({
      accessToken: tok(p.userId, p.organizationId, p.sessionId, env.JWT_SECRET, env.ACCESS_TOKEN_TTL)
    });
  } catch (e) {
    next(new AppError('AUTH_INVALID', 401, 'Invalid refresh session'));
  }
});

app.post('/auth/logout', async (req, res, next) => {
  try {
    if (req.auth) {
      await prisma.session.updateMany({
        where: { id: req.auth.sessionId },
        data: { revokedAt: new Date() }
      });
    }
    clearRefreshCookie(res);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

app.post('/auth/verify', async (req: any, res, next) => {
  try {
    const code = String(req.body.code || '');
    if (code.length < 20) throw new AppError('VALIDATION_ERROR', 400, 'Invalid verification code');
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const u = await prisma.user.findFirst({ where: { verificationToken: hash } });
    if (!u || !u.verificationExpiry || u.verificationExpiry < new Date())
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid or expired verification code');
    await prisma.user.update({
      where: { id: u.id },
      data: { isVerified: true, verificationToken: null, verificationExpiry: null }
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.post('/auth/forgot-password', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^([^@\s]+)@([^@\s]+)\.([^@\s]+)$/.test(email))
      throw new AppError('VALIDATION_ERROR', 400, 'Valid email required');
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: u.id },
        data: {
          resetToken: crypto.createHash('sha256').update(token).digest('hex'),
          resetExpiry: new Date(Date.now() + 30 * 60e3)
        }
      });
      await deliverEmail('reset', email, token);
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.post('/auth/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (token.length < 32 || password.length < 12)
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid token or password');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const u = await prisma.user.findFirst({ where: { resetToken: hash, resetExpiry: { gt: new Date() } } });
    if (!u) throw new AppError('AUTH_INVALID', 401, 'Invalid reset token');
    await prisma.$transaction([
      prisma.user.update({
        where: { id: u.id },
        data: { passwordHash: await bcrypt.hash(password, 12), resetToken: null, resetExpiry: null }
      }),
      prisma.session.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.get('/sites', async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    res.json(await prisma.site.findMany({ where: { organizationId: a.organizationId }, orderBy: { name: 'asc' } }));
  } catch (e) {
    next(e);
  }
});

app.post('/sites', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const b = req.body as any;
    const name = String(b.name || '').trim();
    const address = b.address == null ? null : String(b.address).trim();
    const latitude = Number(b.latitude),
      longitude = Number(b.longitude);
    if (
      name.length < 2 ||
      name.length > 150 ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    )
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid site data');
    const s = await prisma.site.create({
      data: {
        name,
        address,
        latitude,
        longitude,
        isActive: b.isActive !== false,
        organizationId: a.organizationId
      }
    });
    res.status(201).json(s);
  } catch (e) {
    next(e);
  }
});

app.patch('/sites/:id', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const b = req.body as any;
    const data: any = {};
    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (name.length < 2 || name.length > 150) throw new AppError('VALIDATION_ERROR', 400, 'Invalid site name');
      data.name = name;
    }
    if (b.address !== undefined) data.address = b.address == null ? null : String(b.address).trim();
    if (b.latitude !== undefined) {
      data.latitude = Number(b.latitude);
      if (!Number.isFinite(data.latitude) || data.latitude < -90 || data.latitude > 90)
        throw new AppError('VALIDATION_ERROR', 400, 'Invalid latitude');
    }
    if (b.longitude !== undefined) {
      data.longitude = Number(b.longitude);
      if (!Number.isFinite(data.longitude) || data.longitude < -180 || data.longitude > 180)
        throw new AppError('VALIDATION_ERROR', 400, 'Invalid longitude');
    }
    if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);
    const s = await prisma.site.updateMany({ where: { id: req.params.id, organizationId: a.organizationId }, data });
    if (!s.count) throw new AppError('NOT_FOUND', 404, 'Site not found');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.get('/responsables', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    res.json(
      await prisma.responsableProfile.findMany({
        where: { organizationId: a.organizationId },
        include: { user: true, specialties: { include: { specialty: true } }, sites: { include: { site: true } } }
      })
    );
  } catch (e) {
    next(e);
  }
});

app.post('/responsables', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const { userId } = req.body;
    if (typeof userId !== 'string') throw new AppError('VALIDATION_ERROR', 400, 'userId required');
    const membership = await prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: a.organizationId, userId } }
    });
    if (!membership || membership.status !== 'ACTIVE')
      throw new AppError('FORBIDDEN_TENANT', 403, 'User is not an active member of this organization');
    const r = await prisma.responsableProfile.upsert({
      where: { organizationId_userId: { organizationId: a.organizationId, userId } },
      create: { organizationId: a.organizationId, userId },
      update: { isActive: true }
    });
    await prisma.organizationMembership.update({
      where: { organizationId_userId: { organizationId: a.organizationId, userId } },
      data: { roles: { set: ['USER', 'RESPONSABLE'] } }
    });
    res.status(201).json(r);
  } catch (e) {
    next(e);
  }
});

function incidentScope(a: any) {
  if (a.roles.includes('ADMINISTRATOR')) return { organizationId: a.organizationId };
  if (a.roles.includes('RESPONSABLE'))
    return {
      organizationId: a.organizationId,
      assignments: { some: { responsable: { userId: a.userId }, isActive: true } }
    };
  return { organizationId: a.organizationId, reporterId: a.userId };
}

app.get('/incidents', async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const where: any = { ...incidentScope(a) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.siteId) where.siteId = req.query.siteId;
    if (req.query.search)
      where.OR = [
        { title: { contains: req.query.search, mode: 'insensitive' } },
        { id: { contains: req.query.search, mode: 'insensitive' } }
      ];
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const items = await prisma.incident.findMany({
      where,
      include: {
        site: true,
        reporter: true,
        assignments: { where: { isActive: true }, include: { responsable: { include: { user: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });
    const total = await prisma.incident.count({ where });
    res.json({ items, total, page, limit });
  } catch (e) {
    next(e);
  }
});

app.get('/incidents/:id', async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const i = await prisma.incident.findFirst({
      where: { id: req.params.id, ...incidentScope(a) },
      include: {
        site: true,
        reporter: true,
        assignments: { include: { responsable: { include: { user: true } } } },
        progress: { include: { author: true }, orderBy: { createdAt: 'asc' } },
        comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
        attachments: true,
        auditEvents: { include: { actor: true }, orderBy: { createdAt: 'asc' } }
      }
    });
    if (!i) throw new AppError('NOT_FOUND', 404, 'Incident not found');
    res.json(i);
  } catch (e) {
    next(e);
  }
});

app.post('/incidents', async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    if (!a.roles.includes('USER') || !(await prisma.user.findUnique({ where: { id: a.userId } }))?.isVerified)
      throw new AppError('ACCOUNT_UNVERIFIED', 403, 'Verified account required');
    const d = createIncident.parse(req.body);
    const site = await prisma.site.findFirst({
      where: { id: d.siteId, organizationId: a.organizationId, isActive: true }
    });
    if (!site) throw new AppError('FORBIDDEN_TENANT', 403, 'Site is not available');

    let aiResult: { priority: string; category: string; confidence: number } | null = null;
    try {
      const classified = await classifyIncident(d.title || d.description.slice(0, 80), d.description, site.name);
      if (classified.confidence >= 0.6) {
        aiResult = { priority: classified.priority, category: classified.category, confidence: classified.confidence };
      }
    } catch { /* AI classification is best-effort */ }

    const finalPriority = aiResult?.priority || d.priority;
    const finalCategory = aiResult?.category || d.category;

    const i = await prisma.$transaction(async (tx) => {
      const x = await tx.incident.create({
        data: {
          ...d,
          priority: finalPriority as any,
          category: finalCategory as any,
          organizationId: a.organizationId,
          reporterId: a.userId
        }
      });
      await audit(tx, x.id, a.userId, 'CREATED', { status: 'NEW', aiClassification: aiResult });
      return x;
    });
    res.status(201).json({ ...i, aiClassification: aiResult });
  } catch (e) {
    next(e);
  }
});

app.post('/incidents/classify', authenticate, async (req, res, next) => {
  try {
    const { description, siteName } = req.body as any;
    if (!description || description.length < 10) {
      res.json({ priority: null, category: null, confidence: 0 });
      return;
    }
    const result = await classifyIncident(description.slice(0, 80), description, siteName);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

async function getOrgIncident(req: any) {
  const a = req.auth!;
  const i = await prisma.incident.findFirst({ where: { id: req.params.id, organizationId: a.organizationId } });
  if (!i) throw new AppError('FORBIDDEN_TENANT', 403, 'Resource belongs to another tenant');
  return { a, i };
}

app.patch('/incidents/:id/triage', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const { a, i } = await getOrgIncident(req);
    const d = createIncident.pick({ category: true, priority: true }).partial().parse(req.body);
    if (i.status === 'CLOSED') throw new AppError('CONFLICT_STATE', 409, 'Closed incident is read-only');
    const x = await prisma.$transaction(async (tx) => {
      const n = await tx.incident.update({ where: { id: i.id }, data: d });
      await audit(tx, i.id, a.userId, 'TRIAGE', d);
      return n;
    });
    res.json(x);
  } catch (e) {
    next(e);
  }
});

app.post('/incidents/:id/verify', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const { a, i } = await getOrgIncident(req);
    const x = await prisma.$transaction(async (tx) => {
      const n = await tx.incident.update({ where: { id: i.id }, data: { verifiedAt: new Date() } });
      await audit(tx, i.id, a.userId, 'VERIFIED', {});
      return n;
    });
    res.json(x);
  } catch (e) {
    next(e);
  }
});

app.post('/incidents/:id/assign', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const { a, i } = await getOrgIncident(req);
    if (i.status !== 'NEW') throw new AppError('CONFLICT_STATE', 409, 'Incident must be NEW');
    const r = await prisma.responsableProfile.findFirst({
      where: { id: req.body.responsableProfileId, organizationId: a.organizationId, isActive: true }
    });
    if (!r) throw new AppError('FORBIDDEN_TENANT', 403, 'Responsable not in tenant');
    const x = await prisma.$transaction(async (tx) => {
      const n = await tx.incident.updateMany({
        where: { id: i.id, version: i.version, status: 'NEW' },
        data: { status: 'ASSIGNED', version: { increment: 1 } }
      });
      if (!n.count) throw new AppError('CONFLICT_CONCURRENT_UPDATE', 409, 'Incident changed concurrently');
      const as = await tx.assignment.create({
        data: { incidentId: i.id, responsableProfileId: r.id, assignedById: a.userId }
      });
      await audit(tx, i.id, a.userId, 'ASSIGNMENT', { responsableProfileId: r.id });
      return as;
    });
    res.status(201).json(x);
  } catch (e) {
    next(e);
  }
});

app.post('/assignments/:id/accept', requireRole('RESPONSABLE'), async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const as = await prisma.assignment.findFirst({
      where: {
        id: req.params.id,
        isActive: true,
        responsable: { userId: a.userId },
        incident: { organizationId: a.organizationId }
      },
      include: { incident: true }
    });
    if (!as) throw new AppError('FORBIDDEN_NOT_ASSIGNED', 403, 'Assignment not assigned to you');
    assertTransition(as.incident.status, 'IN_PROGRESS');
    const x = await prisma.$transaction(async (tx) => {
      const n = await tx.assignment.update({ where: { id: as.id }, data: { status: 'ACCEPTED' } });
      await tx.incident.update({ where: { id: as.incidentId }, data: { status: 'IN_PROGRESS', version: { increment: 1 } } });
      await audit(tx, as.incidentId, a.userId, 'STATUS', { from: 'ASSIGNED', to: 'IN_PROGRESS' });
      return n;
    });
    res.json(x);
  } catch (e) {
    next(e);
  }
});

app.post('/assignments/:id/reassign', requireRole('RESPONSABLE'), async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 5 || reason.length > 500)
      throw new AppError('VALIDATION_ERROR', 400, 'Reason must be 5-500 chars');
    const as = await prisma.assignment.findFirst({
      where: {
        id: req.params.id,
        isActive: true,
        responsable: { userId: a.userId },
        incident: { organizationId: a.organizationId }
      },
      include: { incident: true }
    });
    if (!as) throw new AppError('FORBIDDEN_NOT_ASSIGNED', 403, 'Assignment not assigned to you');
    const x = await prisma.$transaction(async (tx) => {
      const n = await tx.assignment.update({
        where: { id: as.id },
        data: { status: 'REASSIGNMENT_REQUESTED', reassignReason: reason }
      });
      await audit(tx, as.incidentId, a.userId, 'REASSIGNMENT', { reason });
      return n;
    });
    res.json(x);
  } catch (e) {
    next(e);
  }
});

app.post('/incidents/:id/resolution', requireRole('RESPONSABLE'), async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const d = resolution.parse(req.body);
    const i = await prisma.incident.findFirst({
      where: {
        id: req.params.id,
        organizationId: a.organizationId,
        assignments: { some: { isActive: true, responsable: { userId: a.userId }, status: 'ACCEPTED' } }
      }
    });
    if (!i) throw new AppError('FORBIDDEN_NOT_ASSIGNED', 403, 'Not the active assigned Responsable');
    assertTransition(i.status, 'RESOLVED');
    const x = await prisma.$transaction(async (tx) => {
      const n = await tx.incident.update({
        where: { id: i.id },
        data: { status: 'RESOLVED', resolutionText: d.resolutionText, version: { increment: 1 } }
      });
      await audit(tx, i.id, a.userId, 'RESOLUTION', { resolutionText: d.resolutionText });
      return n;
    });
    res.json(x);
  } catch (e) {
    next(e);
  }
});

app.post('/incidents/:id/reject-resolution', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const { a, i } = await getOrgIncident(req);
    const d = reject.parse(req.body);
    assertTransition(i.status, 'IN_PROGRESS');
    const x = await prisma.$transaction(async (tx) => {
      const n = await tx.incident.update({
        where: { id: i.id },
        data: { status: 'IN_PROGRESS', version: { increment: 1 } }
      });
      await audit(tx, i.id, a.userId, 'REJECTED', { reason: d.reason });
      return n;
    });
    res.json(x);
  } catch (e) {
    next(e);
  }
});

app.post('/incidents/:id/closure', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const { a, i } = await getOrgIncident(req);
    assertTransition(i.status, 'CLOSED');
    const x = await prisma.$transaction(async (tx) => {
      const n = await tx.incident.update({
        where: { id: i.id },
        data: { status: 'CLOSED', version: { increment: 1 } }
      });
      await audit(tx, i.id, a.userId, 'CLOSED', {});
      return n;
    });
    res.json(x);
  } catch (e) {
    next(e);
  }
});

app.post('/incidents/:id/progress', requireRole('RESPONSABLE'), async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const i = await prisma.incident.findFirst({
      where: {
        id: req.params.id,
        organizationId: a.organizationId,
        assignments: { some: { isActive: true, status: 'ACCEPTED', responsable: { userId: a.userId } } }
      }
    });
    if (!i) throw new AppError('FORBIDDEN_NOT_ASSIGNED', 403, 'Not assigned');
    if (i.status === 'CLOSED') throw new AppError('CONFLICT_STATE', 409, 'Closed incident');
    const type = req.body.type;
    if (!['STARTED', 'ON_SITE', 'BLOCKED', 'UPDATE'].includes(type))
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid progress type');
    const note = String(req.body.note || '').trim();
    if (note.length < 1 || note.length > 3000) throw new AppError('VALIDATION_ERROR', 400, 'Invalid progress note');
    const p = await prisma.$transaction(async (tx) => {
      const x = await tx.progressUpdate.create({
        data: { incidentId: i.id, authorId: a.userId, type, note }
      });
      await audit(tx, i.id, a.userId, 'PROGRESS', { type });
      return x;
    });
    res.status(201).json(p);
  } catch (e) {
    next(e);
  }
});

app.post('/incidents/:id/comments', async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const i = await prisma.incident.findFirst({ where: { id: req.params.id, ...incidentScope(a) } });
    if (!i) throw new AppError('NOT_FOUND', 404, 'Incident not found');
    if (i.status === 'CLOSED') throw new AppError('CONFLICT_STATE', 409, 'Closed incident');
    const d = comment.parse(req.body);
    const c = await prisma.$transaction(async (tx) => {
      const x = await tx.comment.create({
        data: { incidentId: i.id, authorId: a.userId, body: d.body },
        include: { author: true }
      });
      await audit(tx, i.id, a.userId, 'COMMENT', {});
      return x;
    });
    res.status(201).json(c);
  } catch (e) {
    next(e);
  }
});

app.get('/incidents/:id/audit', async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const i = await prisma.incident.findFirst({ where: { id: req.params.id, ...incidentScope(a) } });
    if (!i) throw new AppError('NOT_FOUND', 404, 'Incident not found');
    res.json(await prisma.auditEvent.findMany({ where: { incidentId: i.id }, include: { actor: true }, orderBy: { createdAt: 'asc' } }));
  } catch (e) {
    next(e);
  }
});

app.get('/notifications', async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    res.json(await prisma.notification.findMany({ where: { recipientId: a.userId }, orderBy: { createdAt: 'desc' }, take: 50 }));
  } catch (e) {
    next(e);
  }
});

app.patch('/notifications/:id/read', async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const n = await prisma.notification.updateMany({
      where: { id: req.params.id, recipientId: a.userId },
      data: { readAt: new Date() }
    });
    if (!n.count) throw new AppError('FORBIDDEN', 403, 'Notification not yours');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.get('/map/data', async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    res.json({
      sites: await prisma.site.findMany({ where: { organizationId: a.organizationId } }),
      incidents: await prisma.incident.findMany({
        where: incidentScope(a),
        select: { id: true, title: true, status: true, priority: true, latitude: true, longitude: true }
      })
    });
  } catch (e) {
    next(e);
  }
});

app.get('/dashboard', requireRole('ADMINISTRATOR'), async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const where = { organizationId: a.organizationId };
    const [all, active, critical, toReview, closed, statuses, priorities] = await Promise.all([
      prisma.incident.count({ where }),
      prisma.incident.count({ where: { ...where, status: { not: 'CLOSED' } } }),
      prisma.incident.count({ where: { ...where, priority: 'CRITICAL', status: { not: 'CLOSED' } } }),
      prisma.incident.count({ where: { ...where, status: 'RESOLVED' } }),
      prisma.incident.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.incident.groupBy({ by: ['status'], where, _count: true }),
      prisma.incident.groupBy({ by: ['priority'], where, _count: true })
    ]);
    res.json({ all, active, critical, toReview, closed, statuses, priorities });
  } catch (e) {
    next(e);
  }
});

app.post('/incidents/:id/attachments', upload.single('file'), async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const i = await prisma.incident.findFirst({ where: { id: req.params.id, ...incidentScope(a) } });
    if (!i) throw new AppError('NOT_FOUND', 404, 'Incident not found');
    if (i.status === 'CLOSED') throw new AppError('CONFLICT_STATE', 409, 'Closed incident');
    if (!req.file) throw new AppError('VALIDATION_ERROR', 400, 'File required');
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(req.file.mimetype))
      throw new AppError('UNSUPPORTED_MEDIA_TYPE', 415, 'Only JPEG, PNG and WebP are allowed');
    const ref = await saveFile(req.file.buffer, req.file.mimetype);
    const cleanName = path.basename(req.file.originalname).slice(0, 255);
    const attachment = await prisma.$transaction(async (tx) => {
      const x = await tx.attachment.create({
        data: {
          incidentId: i.id,
          uploadedById: a.userId,
          originalName: cleanName,
          mimeType: req.file!.mimetype,
          sizeBytes: req.file!.size,
          storageRef: ref
        }
      });
      await audit(tx, i.id, a.userId, 'ATTACHMENT', { attachmentId: x.id });
      return x;
    });
    res.status(201).json(attachment);
  } catch (e) {
    next(e);
  }
});

app.get('/incidents/:id/attachments/:attId', async (req: any, res, next) => {
  try {
    const a = await ctx(req);
    const i = await prisma.incident.findFirst({ where: { id: req.params.id, ...incidentScope(a) } });
    if (!i) throw new AppError('NOT_FOUND', 404, 'Incident not found');
    const at = await prisma.attachment.findFirst({ where: { id: req.params.attId, incidentId: i.id } });
    if (!at) throw new AppError('NOT_FOUND', 404, 'Attachment not found');
    res.type(contentType(at.storageRef)).send(await readFile(at.storageRef));
  } catch (e) {
    next(e);
  }
});

app.use(errorHandler);
export default app;
