import { Router } from 'express';
import { 
  createIncident, 
  listIncidents, 
  triageIncident, 
  getEligibleResponsables, 
  createAssignment,
  updateAssignmentStatus,
  createProgressUpdate,
  resolveIncident,
  closeIncident,
  addComment
} from './incidents.controller.js';
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

// Assignment Acceptance
incidentsRouter.patch('/:id/assignments/:assignmentId/status', updateAssignmentStatus);

// Progress Updates
incidentsRouter.post('/:id/progress-updates', createProgressUpdate);

// Resolution & Closure
incidentsRouter.post('/:id/resolve', resolveIncident);
incidentsRouter.post('/:id/close', closeIncident);

// Comments
incidentsRouter.post('/:id/comments', addComment);
