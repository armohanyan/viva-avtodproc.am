#!/usr/bin/env bash
# Run on the server: pull, build both client apps and the backend, restart PM2.
set -euo pipefail

cd "$(dirname "$0")"

echo "== repo =="
pwd
git rev-parse --short HEAD
git status --short || true

echo "== pull =="
git pull --ff-only
echo "now: $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

echo "== backend install + build =="
npm --prefix backend ci --include=dev
npm --prefix backend run build

echo "== client install =="
npm --prefix client ci --include=dev

echo "== client: marketing (Next) =="
npm run build:marketing --prefix client

echo "== client: app (Vite panel) =="
npm run build:app --prefix client

echo "== restart pm2 =="
pm2 restart viva-api viva-web --update-env
pm2 list

echo "== health =="
curl -fsS -o /dev/null -w "web:%{http_code}\n" https://viva-avtodproc.am
curl -fsS -o /dev/null -w "api:%{http_code}\n" http://127.0.0.1:13101/api/v1/health

echo "Redeploy completed."
