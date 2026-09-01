import express, { type Express } from 'express';
import { healthRouter } from './routes/health.js';

export const app: Express = express();

app.use(express.json());

app.use('/health', healthRouter);
