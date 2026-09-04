import { Router } from 'express';
import { createIncident, listIncidents, triageIncident, getEligibleResponsables, createAssignment } from './incidents.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrganization } from '../../middleware/requireOrganization.js';

export const incidentsRouter: Router = Router();

incidentsRouter.use(authenticate);
incidentsRouter.use(requireOrganization);

incidentsRouter.post('/', createIncident);
incidentsRouter.get('/', listIncidents);
incidentsRouter.patch('/:id/triage', triageIncident);
incidentsRouter.get('/:id/eligible-responsables', getEligibleResponsables);
incidentsRouter.post('/:id/assignments', createAssignment);
