# Lemak Cafe Dashboard

Sales dashboard and order management for a three-branch cafe in Singapore (Jurong West, Changi Airport Terminal 2, Singapore CBD).

- Staff sign-in only (email + password, no sign-up), order create / edit / delete, sales charts and KPIs
- English, Bahasa Melayu, 中文 and தமிழ் (`/en`, `/ms`, `/zh`, `/ta`); amounts in SGD, times in Singapore time
- Mobile-friendly: sidebar on desktop, drawer and card layouts on phones

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · Tailwind v4 + shadcn/ui · Recharts · Prisma 7 + PostgreSQL 18 · iron-session · zod · bun

> This Next.js version has breaking changes (for example `middleware` is now `proxy.ts`, and `error.tsx` receives `retry`). Read the docs in `node_modules/next/dist/docs/` before changing framework-level code.

## Requirements

- [Bun](https://bun.sh) 1.3+
- **PostgreSQL 18**

## Setup

1. **Install dependencies**

   ```bash
   bun install
   ```

2. **Create the database and a role** (run once as the `postgres` superuser, e.g. in pgAdmin):

   ```sql
   CREATE ROLE lemak_cafe_admin LOGIN CREATEDB PASSWORD 'choose-a-strong-password';
   CREATE DATABASE lemak_cafe_dashboard OWNER lemak_cafe_admin;
   ```

   The role must own the database and its tables. `CREATEDB` is only needed for `bun db:migrate` (Prisma's shadow database); `bun db:deploy` works without it.

3. **Configure the environment**: copy `.env.example` to `.env` and fill it in.

   | Variable | Notes |
   | --- | --- |
   | `DATABASE_URL` | `postgresql://lemak_cafe_admin:PASSWORD@localhost:5432/lemak_cafe_dashboard?schema=public`. URL-encode special characters in the password (`@` → `%40`, `+` → `%2B`, `/` → `%2F`). |
   | `SESSION_SECRET` | At least 32 characters. Generate with `openssl rand -base64 32`. Changing it signs everyone out. |
   | `SEED_USERS` | `email:password:name`, comma-separated. Used by `bun db:seed`. |

4. **Create the tables and seed data**

   ```bash
   bun db:deploy   # applies the migrations in prisma/migrations
   bun db:seed     # users from SEED_USERS, the 3 branches, ~60 days of sample orders
   ```

   The seed can be re-run safely: it updates users and branches, and only adds sample orders if there are none.

5. **Change the seeded passwords.** Edit `SEED_USERS` in `.env` and run `bun db:seed` again, or create real accounts with `bun create-staff` (below) and remove the sample users from the database.

6. **Run it**

   ```bash
   bun dev
   ```

   Open <http://localhost:3000>. You are redirected to `/{language}/login`.

## Scripts

| Command | What it does |
| --- | --- |
| `bun dev` / `bun run build` / `bun start` | Development server, production build, production server |
| `bun run lint` | ESLint |
| `bun db:deploy` | Apply existing migrations (`prisma migrate deploy`) |
| `bun db:migrate` | Create and apply a new migration during development (needs `CREATEDB`) |
| `bun db:seed` | Seed users, branches and sample orders |
| `bun db:studio` | Prisma Studio |
| `bun create-staff` | Interactive prompt to add a staff account: name, branch, email, password (shown as `*`) |

## Deployment (Docker + a VPS)

`browser → Nginx (TLS) → Next.js (standalone, Node) → PostgreSQL 18`. Only Nginx publishes ports (80/443); the app and the database are reachable only on the Docker network.

| File | Purpose |
| --- | --- |
| `Dockerfile` | `runner` (production image), `migrator` (runs `prisma migrate deploy`, also hosts `create-staff`) |
| `docker-compose.prod.yml` | `db` (postgres:18 + volume), `migrate` (one-shot), `app`, `nginx` |
| `nginx/default.conf.template` | HTTPS, HTTP→HTTPS redirect, forwarded headers, rate limit on `/…/login` |
| `.env.production.example` | Server-side settings (copy to `.env.production`, never commit) |
| `.github/workflows/ci.yml`, `deploy.yml` | CI against Postgres 18, then build → GHCR → SSH deploy |
| `deploy/backup.sh` | `pg_dump` backup with retention |

### One-time server setup

1. A Linux VPS with Docker + the Compose plugin, a DNS record for your domain pointing at it, and ports 80/443 open.
2. Get a certificate (before the first start, while port 80 is free):
   `sudo certbot certonly --standalone -d cafe.example.com`. Renew with a deploy hook such as `docker compose … exec nginx nginx -s reload`.
3. Create the deployment directory, e.g. `/opt/lemak-cafe`, and put `.env.production` in it (copy `.env.production.example`; set `DOMAIN`, `TLS_CERT_DIR`, a strong `POSTGRES_PASSWORD` and the matching `DATABASE_URL`, and a new `SESSION_SECRET`).
4. In GitHub: add secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY` (and optionally `SSH_PORT`), a repository variable `DEPLOY_PATH` (the directory above), and a `production` environment (add required reviewers there if you want approval before each deploy). The server user must be allowed to run `docker`.
5. Push to `main`. CI runs first; when it passes, **Deploy** builds and pushes the images, copies the compose and Nginx files, and restarts the stack. The `migrate` job applies pending migrations before the new app starts, and the workflow fails if the app does not become healthy.

> Session cookies are `Secure` in production, so sign-in only works over HTTPS (or `http://localhost`). Over plain HTTP on another host, login will appear to do nothing.

### First deploy: create staff accounts and (optionally) sample data

The seed script is not part of the image. Create real accounts with the interactive prompt:

```bash
cd /opt/lemak-cafe
docker compose --env-file .env.production --env-file .env.images -f docker-compose.prod.yml \
  run --rm migrate bunx tsx scripts/create-staff.ts
```

### Operations

```bash
COMPOSE="docker compose --env-file .env.production --env-file .env.images -f docker-compose.prod.yml"
$COMPOSE ps                 # status
$COMPOSE logs -f app        # app logs
./deploy/backup.sh          # database backup into ./backups (schedule it with cron)
```

**Roll back:** `cp .env.images.prev .env.images && $COMPOSE up -d`. Migrations are forward-only, so only roll back to a version compatible with the current schema.

**PostgreSQL 18 volume:** the volume is mounted at `/var/lib/postgresql` (not `/var/lib/postgresql/data`), because 18+ images keep data under `/var/lib/postgresql/18/docker`.

## How it fits together

- **No REST API.** Pages are Server Components that query through `lib/queries/*` (Prisma) after `verifySession()`. Writes are Server Actions in `actions/`. Database credentials never reach the browser.
- **Auth.** `proxy.ts` does the locale redirect and an optimistic session check. Every page and Server Action re-verifies the session in `lib/dal.ts`, because the proxy alone is not a security boundary. Login is rate-limited in memory per IP and email (5 failures per 15 minutes), which is per server process.
- **Money** is stored as integer cents, and order totals are always recomputed on the server.
- **Dates.** Order times are stored in UTC and grouped by Singapore calendar day. The order form takes Singapore time.
- **Staff branch.** A staff member's branch is only a default for new orders. Every signed-in user can see all branches.
- **Translations** live in `i18n/dictionaries/*.json`. `en.json` is the source of truth; all four files must have the same keys.

## Project layout

```
app/[lang]/            localized routes: login, (app)/dashboard, (app)/orders
actions/               Server Actions (auth, orders)
components/            ui/ (shadcn), layout/, charts/, orders/
i18n/                  config, formatting helpers, dictionaries
lib/                   prisma, session, dal, validation, queries/
prisma/                schema, migrations, seed
scripts/create-staff.ts
proxy.ts               locale + auth redirects
```
