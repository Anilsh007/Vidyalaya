#!/usr/bin/env sh
set -eu

if [ "${MIGRATE_ON_START:-true}" = "true" ]; then
  echo "Applying Prisma migrations..."
  npx prisma migrate deploy
fi

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Seeding demo data..."
  npm run prisma:seed
fi

exec npm run start
