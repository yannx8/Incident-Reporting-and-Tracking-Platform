FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules packages/backend/node_modules
COPY --from=deps /app/packages/frontend/node_modules packages/frontend/node_modules
COPY . .
RUN pnpm --filter backend build
RUN pnpm --filter frontend build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nexus
COPY --from=builder /app/packages/backend/dist packages/backend/dist
COPY --from=builder /app/packages/backend/prisma packages/backend/prisma
COPY --from=builder /app/packages/backend/node_modules packages/backend/node_modules
COPY --from=builder /app/packages/backend/package.json packages/backend/
COPY --from=builder /app/packages/frontend/dist packages/frontend/dist
COPY --from=builder /app/node_modules/.pnpm/node_modules packages/backend/node_modules/.pnpm/node_modules
WORKDIR /app/packages/backend
USER nexus
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
