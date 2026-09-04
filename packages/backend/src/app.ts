import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { incidentsRouter } from './modules/incidents/incidents.routes.js';
import { sitesRouter } from './modules/sites/sites.routes.js';
import { membershipsRouter } from './modules/memberships/memberships.routes.js';

export const app: Express = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/memberships', membershipsRouter);
