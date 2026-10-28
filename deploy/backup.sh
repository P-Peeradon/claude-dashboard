#!/usr/bin/env bash
# Dumps the production database with the PostgreSQL 18 pg_dump inside the db container.
# Run from the deployment directory (where docker-compose.prod.yml lives), e.g. from cron:
#   0 3 * * *  cd /opt/lemak-cafe && ./deploy/backup.sh
# Restore:  gunzip -c backups/<file>.sql.gz | docker compose ... exec -T db psql -U <user> -d <db>
set -euo pipefail

COMPOSE=(docker compose --env-file .env.production --env-file .env.images -f docker-compose.prod.yml)
KEEP_DAYS="${KEEP_DAYS:-14}"

set -a; source .env.production; set +a
mkdir -p backups
FILE="backups/${POSTGRES_DB}-$(date +%Y%m%d-%H%M%S).sql.gz"

"${COMPOSE[@]}" exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner | gzip > "$FILE"
echo "Wrote $FILE"

find backups -name '*.sql.gz' -mtime +"$KEEP_DAYS" -delete
