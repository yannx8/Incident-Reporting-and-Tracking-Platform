import app from './app.js';
import { env } from './env.js';
import { prisma } from './lib/prisma.js';

const server = app.listen(env.PORT, () =>
  console.log(
    JSON.stringify({
      level: 'info',
      service: 'nexus-incidents',
      event: 'server_started',
      port: env.PORT,
      env: env.NODE_ENV
    })
  )
);

async function shutdown(signal: string) {
  console.log(JSON.stringify({ level: 'info', event: 'shutdown', signal }));
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
