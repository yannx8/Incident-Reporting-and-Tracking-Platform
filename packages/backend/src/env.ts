// Load environment variables from the backend .env file at process startup.
// Node >=20.12 supports process.loadEnvFile natively (no dotenv dependency).
// Real environment variables take precedence and are never overridden.
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}