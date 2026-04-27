# RUPTL Dashboard — PLN

PLN RUPTL Project Management Dashboard · 5,000 infrastructure projects across Indonesia.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Backend | NestJS + TypeScript (Node.js 20) |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Map | Leaflet + leaflet.markercluster |
| Auth | JWT (httpOnly cookies) + bcrypt |
| Deploy | Docker Compose + Nginx + Certbot |

## Roles

| Role | Permissions |
|---|---|
| `ADMIN` | Full access — users, projects, audit log, import |
| `PIC` | Create / edit / delete projects, bulk import |
| `MANAGEMENT` | View only — map, analytics |

## Local Development

### Prerequisites

- Node.js 20+, pnpm 9+ (`npm i -g pnpm`)
- Docker + Docker Compose

### Setup

```bash
git clone git@github.com:syahrul2690/ruptl-dashboard.git
cd ruptl-dashboard

# Install all workspace dependencies
pnpm install

# Copy API env
cp .env.example apps/api/.env
# Edit apps/api/.env if needed

# Start Postgres
docker compose up -d

# Migrate DB + seed admin user
pnpm db:migrate
pnpm db:seed

# Run API (terminal 1)
pnpm dev:api

# Run web (terminal 2)
pnpm dev:web
```

- **Web** → http://localhost:5173
- **API** → http://localhost:3000/api
- **DB Studio** → `pnpm db:studio`

### Default dev credentials

| Field | Value |
|---|---|
| Email | `admin@pln.local` |
| Password | `Admin@1234` |

## Production (VPS)

1. SSH into VPS, install Docker + Docker Compose, clone repo.
2. Create `/home/<user>/ruptl-dashboard/.env.prod` (see `.env.example`).
3. Set GitHub Actions secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.
4. Push to `main` — GitHub Actions auto-deploys.
5. Run Certbot once to issue TLS cert (see `nginx/nginx.conf`).

## Project structure

```
apps/
  api/           NestJS backend
    src/
      auth/      Login, JWT, refresh
      users/     User CRUD (Admin only)
      projects/  Project CRUD + filters + pagination
      import/    Excel bulk import
      analytics/ Aggregation endpoints (cached 5 min)
      audit/     Audit log
      prisma/    Prisma service
    prisma/
      schema.prisma
      seed.ts
  web/           React + Vite SPA
    src/
      pages/     Login, Map, Analytics, Input, Admin
      components/
      lib/       API client, types
      context/   AuthContext
    legacy/      Original HTML prototype (reference only)
nginx/           Reverse proxy config
.github/         CI/CD
```
