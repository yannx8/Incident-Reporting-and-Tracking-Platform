import { Router } from 'express';
import { 
  listMemberships, 
  assignRole, 
  revokeRole, 
  assignResponsableSite, 
  revokeResponsableSite 
} from './memberships.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrganization } from '../../middleware/requireOrganization.js';

export const membershipsRouter: Router = Router();

membershipsRouter.use(authenticate);
membershipsRouter.use(requireOrganization);

membershipsRouter.get('/', listMemberships);
membershipsRouter.post('/', assignRole);
membershipsRouter.patch('/:id/revoke', revokeRole);
membershipsRouter.post('/:id/sites', assignResponsableSite);
membershipsRouter.delete('/:id/sites/:siteId', revokeResponsableSite);
