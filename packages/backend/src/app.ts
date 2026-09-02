import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { authRouter } from './modules/auth/auth.routes.js';

export const app: Express = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
