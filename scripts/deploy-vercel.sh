#!/usr/bin/env bash
# One-command Vercel deploy for Temp Empire (production domain: www.tempempire.store)
# Prerequisites:
#   npm i -g vercel   OR use: npx vercel
#   vercel login      OR export VERCEL_TOKEN=...
#   Postgres DATABASE_URL set in Vercel project env (see .env.production.example)
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v vercel >/dev/null 2>&1 && ! npx --yes vercel --version >/dev/null 2>&1; then
  echo "ERROR: vercel CLI not available. Run: npm i -g vercel && vercel login"
  exit 1
fi

VC=(vercel)
command -v vercel >/dev/null 2>&1 || VC=(npx --yes vercel)

echo "==> Linking / deploying to Vercel (production)"
"${VC[@]}" --prod --yes

echo ""
echo "After first deploy:"
echo "  1. Vercel → Project → Settings → Domains → add www.tempempire.store + tempempire.store"
echo "  2. Set DNS at Namecheap (see docs/domain-attach-tempempire-store.md in the agent store)"
echo "  3. Set env vars from .env.production.example (AUTH_URL, DATABASE_URL, AUTH_SECRET)"
echo "  4. Run seed once: vercel env pull && DATABASE_URL=... npx prisma db push --schema=prisma/schema.postgres.prisma && npm run db:seed"
