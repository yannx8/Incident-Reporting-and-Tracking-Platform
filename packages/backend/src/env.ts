import { z } from 'zod';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const p of [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'packages/backend/.env')]) {
  try {
    if (existsSync(p)) {
      process.loadEnvFile(p);
      break;
    }
  } catch {}
}
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  STORAGE_PATH: z.string().min(1).default('./uploads'),
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.boolean().default(false),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  GEMINI_API_KEY: z.string().optional()
});
export const env = schema.parse(process.env);
