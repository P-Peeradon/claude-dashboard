# syntax=docker/dockerfile:1

# ---- deps: install everything (needed to build and to run the Prisma CLI) ----
FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- build: generate the Prisma client and produce the standalone Next.js build ----
FROM deps AS build
WORKDIR /app
COPY . .
RUN bunx prisma generate
RUN bun run build

# ---- migrator: applies migrations and hosts one-off admin scripts (e.g. create-staff) ----
# Not run by default. docker-compose.prod.yml runs it as a one-shot job before the app starts.
FROM deps AS migrator
WORKDIR /app
COPY package.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN bunx prisma generate
CMD ["bunx", "prisma", "migrate", "deploy"]

# ---- runner: the production image (last stage, so it is the default target) ----
FROM node:22-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
# The login page is static and needs no database, so it is a cheap liveness probe.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/en/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
