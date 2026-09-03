import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, me, verify } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

export const authRouter: Router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.post('/logout', logout);
authRouter.post('/verify', verify);
authRouter.get('/me', authenticate, me);
