# Deployment Guide

Local → GitHub → VPS deployment workflow for `ruptl-dashboard`.

---

## Infrastructure

| Item | Value |
|---|---|
| VPS IP | `103.93.161.157` |
| VPS user | `pusmanpro` |
| SSH key | `~/.ssh/ruptl-dashboard.pem` |
| Project path on VPS | `~/ruptl-dashboard` |
| GitHub repo | `syahrul2690/ruptl-dashboard` |
| Main branch | `main` |

---

## Standard Deployment (code change)

### 1. Commit and push to GitHub

```bash
git add <files>
git commit -m "your message"
git push origin main
```

### 2. Pull on VPS

```bash
ssh -i ~/.ssh/ruptl-dashboard.pem pusmanpro@103.93.161.157 \
  "cd ~/ruptl-dashboard && git pull origin main"
```

### 3. Rebuild and restart the changed service

**API only** (most common):
```bash
ssh -i ~/.ssh/ruptl-dashboard.pem pusmanpro@103.93.161.157 \
  "cd ~/ruptl-dashboard && docker compose -f docker-compose.prod.yml up -d --build api"
```

**Web only:**
```bash
ssh -i ~/.ssh/ruptl-dashboard.pem pusmanpro@103.93.161.157 \
  "cd ~/ruptl-dashboard && docker compose -f docker-compose.prod.yml up -d --build web"
```

**Both API and web:**
```bash
ssh -i ~/.ssh/ruptl-dashboard.pem pusmanpro@103.93.161.157 \
  "cd ~/ruptl-dashboard && docker compose -f docker-compose.prod.yml up -d --build api web"
```

### 4. Verify

```bash
ssh -i ~/.ssh/ruptl-dashboard.pem pusmanpro@103.93.161.157 \
  "docker ps && docker logs ruptl-dashboard-api-1 --tail 20"
```

The API is healthy when the logs end with:
```
✔ API running on http://localhost:3000/api
```

---

## Running Containers

| Container | Image | Role |
|---|---|---|
| `ruptl-dashboard-api-1` | `ruptl-dashboard-api` | NestJS API |
| `ruptl-dashboard-web-1` | `ruptl-dashboard-web` | Next.js frontend |
| `ruptl-dashboard-nginx-1` | `nginx:alpine` | Reverse proxy (port 80) |
| `ruptl-dashboard-db-1` | `postgres:16-alpine` | PostgreSQL database |

---

## GitHub Actions Auto-Deploy

Every push to `main` triggers the `.github/workflows/deploy.yml` workflow, which SSHes into the VPS and runs the full rebuild automatically.

### Required Repository Secrets

The workflow uses 3 secrets. If any are missing, the deploy step will fail with **"Error: missing server host"**.

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

Choose **Repository secret** (not Environment secret), then add each one:

| Secret Name | Value |
|---|---|
| `VPS_HOST` | `103.93.161.157` |
| `VPS_USER` | `pusmanpro` |
| `VPS_SSH_KEY` | Full contents of `~/.ssh/ruptl-dashboard.pem` (include the `-----BEGIN/END-----` lines) |

### How to verify secrets are set

Go to **Settings → Secrets and variables → Actions**. You should see all 3 listed under *Repository secrets*.

### What the workflow does on each push

```
git pull origin main
docker compose -f docker-compose.prod.yml build --no-cache api web
docker compose -f docker-compose.prod.yml up -d
docker image prune -f
```

---

## Known Gotchas

### Prisma version must be pinned in the runner stage

`prisma` CLI is a **devDependency**. The Docker runner stage only installs prod deps, so `npx prisma` (without a version) downloads the **latest** from npm — which is currently v7 and has breaking schema changes.

The Dockerfile pins the version explicitly in the runner stage:
```dockerfile
RUN npx prisma@5.22.0 generate
CMD ["sh", "-c", "npx prisma@5.22.0 migrate deploy && node dist/main"]
```

**When you upgrade Prisma** (change `^5.x.x` in `apps/api/package.json`):
1. Run `pnpm install` locally to update the lockfile.
2. Check the resolved version: `grep 'prisma@' pnpm-lock.yaml | head -5`
3. Update both `prisma@x.x.x` references in `apps/api/Dockerfile`.
4. Commit, push, and redeploy.

### The builder stage does NOT need a pinned version

The builder stage runs `pnpm install --frozen-lockfile` which installs the devDeps including the prisma CLI. `npx prisma generate` there uses the locally installed version automatically — no pin needed.

### `docker compose` not `docker-compose`

The VPS uses the modern Docker Compose plugin (`docker compose`). The hyphenated `docker-compose` command is not available.

---

## Database Operations

Connect to the database directly:
```bash
ssh -i ~/.ssh/ruptl-dashboard.pem pusmanpro@103.93.161.157 \
  "docker exec ruptl-dashboard-db-1 psql -U ruptl -d ruptl_db -c '<SQL>'"
```

Examples:
```bash
# Count projects
"... -c 'SELECT COUNT(*) FROM \"Project\";'"

# Delete all projects
"... -c 'TRUNCATE TABLE \"Project\" CASCADE;'"
```

Credentials are in `~/ruptl-dashboard/.env` on the VPS:
- User: `ruptl`
- DB: `ruptl_db`

---

## Environment Variables (.env on VPS)

Located at `~/ruptl-dashboard/.env`. Edit directly on the VPS if values need to change — then restart the affected container (no rebuild needed for env-only changes):

```bash
ssh -i ~/.ssh/ruptl-dashboard.pem pusmanpro@103.93.161.157 \
  "cd ~/ruptl-dashboard && docker compose -f docker-compose.prod.yml restart api"
```

---

## Full Restart (no rebuild)

If containers need restarting without a code change (e.g. after editing `.env`):

```bash
ssh -i ~/.ssh/ruptl-dashboard.pem pusmanpro@103.93.161.157 \
  "cd ~/ruptl-dashboard && docker compose -f docker-compose.prod.yml restart"
```

## Full Teardown and Rebuild (last resort)

```bash
ssh -i ~/.ssh/ruptl-dashboard.pem pusmanpro@103.93.161.157 \
  "cd ~/ruptl-dashboard && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d --build"
```

> The `postgres_data` volume is preserved on `down` — database data is not lost.
