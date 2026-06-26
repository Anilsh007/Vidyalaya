#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  source "${ENV_FILE}"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
POSTGRES_DB="${POSTGRES_DB:-school_erp}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

mkdir -p "${BACKUP_DIR}"

OUTPUT_FILE="${BACKUP_DIR}/school-erp-${TIMESTAMP}.sql"

echo "Creating database backup at ${OUTPUT_FILE}"

if docker compose ps db >/dev/null 2>&1; then
  docker compose exec -T db pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > "${OUTPUT_FILE}"
else
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "DATABASE_URL is not set."
    exit 1
  fi

  pg_dump "${DATABASE_URL}" > "${OUTPUT_FILE}"
fi

gzip -f "${OUTPUT_FILE}"

find "${BACKUP_DIR}" -type f -name "school-erp-*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "Backup completed: ${OUTPUT_FILE}.gz"
