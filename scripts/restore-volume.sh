#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: ./scripts/restore-volume.sh <postgres|uploads> <backup-file.tar.gz>"
  exit 1
fi

VOLUME_NAME="$1"
INPUT_FILE="$2"

if [[ ! -f "${INPUT_FILE}" ]]; then
  echo "Backup file not found: ${INPUT_FILE}"
  exit 1
fi

case "${VOLUME_NAME}" in
  postgres)
    TARGET_VOLUME="school_erp_postgres_data"
    ;;
  uploads)
    TARGET_VOLUME="school_erp_uploads_data"
    ;;
  *)
    echo "Unknown volume '${VOLUME_NAME}'. Use 'postgres' or 'uploads'."
    exit 1
    ;;
esac

docker run --rm \
  -v "${TARGET_VOLUME}:/volume" \
  -v "$(cd "$(dirname "${INPUT_FILE}")" && pwd):/backup" \
  alpine \
  sh -c "rm -rf /volume/* && cd / && tar xzf /backup/$(basename "${INPUT_FILE}")"

echo "Volume restore completed for ${TARGET_VOLUME}."
