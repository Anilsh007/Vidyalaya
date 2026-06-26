#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/restore-db.sh <backup-file.sql.gz or backup-file.sql>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
POSTGRES_DB="${POSTGRES_DB:-school_erp}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  source "${ENV_FILE}"
  set +a
fi

INPUT_FILE="$1"

if [[ ! -f "${INPUT_FILE}" ]]; then
  echo "Backup file not found: ${INPUT_FILE}"
  exit 1
fi

echo "Restoring database from ${INPUT_FILE}"

if docker compose ps db >/dev/null 2>&1; then
  if [[ "${INPUT_FILE}" == *.gz ]]; then
    gunzip -c "${INPUT_FILE}" | docker compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
  else
    docker compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${INPUT_FILE}"
  fi
else
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "DATABASE_URL is not set."
    exit 1
  fi

  if [[ "${INPUT_FILE}" == *.gz ]]; then
    gunzip -c "${INPUT_FILE}" | psql "${DATABASE_URL}"
  else
    psql "${DATABASE_URL}" < "${INPUT_FILE}"
  fi
fi

echo "Restore completed."
