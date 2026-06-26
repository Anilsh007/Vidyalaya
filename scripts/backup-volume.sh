#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "${BACKUP_DIR}"

docker run --rm \
  -v school_erp_postgres_data:/volume \
  -v "${BACKUP_DIR}:/backup" \
  alpine \
  tar czf "/backup/postgres-data-${TIMESTAMP}.tar.gz" /volume

docker run --rm \
  -v school_erp_uploads_data:/volume \
  -v "${BACKUP_DIR}:/backup" \
  alpine \
  tar czf "/backup/uploads-data-${TIMESTAMP}.tar.gz" /volume

echo "Volume backups completed:"
echo "  ${BACKUP_DIR}/postgres-data-${TIMESTAMP}.tar.gz"
echo "  ${BACKUP_DIR}/uploads-data-${TIMESTAMP}.tar.gz"
