#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f ".env" ]]; then
  echo "Please copy .env.example to .env first."
  exit 1
fi

npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed

echo "Setup complete. Run: npm run dev"
