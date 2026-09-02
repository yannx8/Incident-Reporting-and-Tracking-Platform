import { Router } from 'express';
import { register, login, logout, me } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

export const authRouter: Router = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);
