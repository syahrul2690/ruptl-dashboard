# Build context: repo root (docker-compose.prod.yml sets context: .)
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

# Install all workspace deps (cached layer)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter api...

# Copy source
COPY tsconfig.base.json ./
COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN pnpm run build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod --filter api...

COPY --from=builder /app/apps/api/dist    ./apps/api/dist
COPY --from=builder /app/apps/api/prisma  ./apps/api/prisma

WORKDIR /app/apps/api
RUN npx prisma generate

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
