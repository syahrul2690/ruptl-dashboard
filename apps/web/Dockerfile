# Build context: repo root (docker-compose.prod.yml sets context: .)
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

# Install all workspace deps (cached layer)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter web...

# Copy source
COPY apps/web ./apps/web

WORKDIR /app/apps/web
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm run build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist    /usr/share/nginx/html
COPY apps/web/nginx-spa.conf              /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
