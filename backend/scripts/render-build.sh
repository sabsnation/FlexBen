#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> npm install"
npm install

echo "==> prisma provider (postgres no Render)"
node scripts/ensure-prisma-provider.js

echo "==> prisma generate"
npx prisma generate

echo "==> prisma migrate deploy"
if ! npx prisma migrate deploy; then
  echo "WARN: migrate deploy falhou — tentando db push para sincronizar schema"
  npx prisma db push --skip-generate
fi

echo "==> seed"
npm run db:seed

echo "==> build OK"
