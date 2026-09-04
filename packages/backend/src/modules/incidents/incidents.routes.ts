import { Router } from 'express';
import { createIncident, listIncidents } from './incidents.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrganization } from '../../middleware/requireOrganization.js';

export const incidentsRouter: Router = Router();

// Apply authentication and organization context middleware to all routes
incidentsRouter.use(authenticate);
incidentsRouter.use(requireOrganization);

incidentsRouter.post('/', createIncident);
incidentsRouter.get('/', listIncidents);
