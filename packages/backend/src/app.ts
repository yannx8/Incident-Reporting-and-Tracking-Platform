import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { prisma } from './lib/prisma.js';
import { AppError } from './lib/errors.js';
import { authenticate } from './middleware/authenticate.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './lib/rateLimiter.js';
import authRoutes from './modules/auth/auth.routes.js';
import siteRoutes from './modules/sites/sites.routes.js';
import responsableRoutes from './modules/responsables/responsables.routes.js';
import incidentRoutes from './modules/incidents/incidents.routes.js';
import assignmentRoutes from './modules/assignments/assignments.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import mapRoutes from './modules/map/map.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import attachmentRoutes from './modules/attachments/attachments.routes.js';

const app = express();
// Trust proxy is configurable to support reverse proxies (nginx, ALB) in production
// while avoiding false IP spoofing in local development
app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');
// Security headers: defense-in-depth against common web vulnerabilities
// CSP allows OpenStreetMap tiles for incident map views
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(self),camera=(),microphone=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"
  );
  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '1mb' }));
// Global rate limiter applied to all routes; separate per-route limiters exist for auth
app.use(apiLimiter);

// Health: always 200 if process is alive (for load balancers)
app.get('/health', (_q, res) => res.json({ status: 'ok', service: 'nexus-incidents' }));
// Ready: 200 only when database is reachable (for k8s readiness probes)
app.get('/ready', async (_q, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch (e) {
    next(new AppError('NOT_READY', 503, 'Database unavailable'));
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

// Auth routes mounted before authenticate middleware (login/register don't need auth)
app.use('/auth', authRoutes);
// Everything below requires authentication
app.use(authenticate);
app.use('/sites', siteRoutes);
app.use('/responsables', responsableRoutes);
app.use('/incidents', incidentRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/notifications', notificationRoutes);
app.use('/map', mapRoutes);
app.use('/dashboard', dashboardRoutes);
// Attachments share the /incidents prefix; mounted separately to keep module boundaries
app.use('/incidents', attachmentRoutes);

// Error handler must be last to catch all thrown errors
app.use(errorHandler);
export default app;
