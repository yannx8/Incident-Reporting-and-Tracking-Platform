import { Router } from 'express';
import { createSite, listSites, updateSite } from './sites.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrganization } from '../../middleware/requireOrganization.js';

export const sitesRouter: Router = Router();

sitesRouter.use(authenticate);
sitesRouter.use(requireOrganization);

sitesRouter.post('/', createSite);
sitesRouter.get('/', listSites);
sitesRouter.patch('/:id', updateSite);
