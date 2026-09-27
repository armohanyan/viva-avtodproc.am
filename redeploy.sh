#!/usr/bin/env bash
# From your machine: pull on the server, build both client apps and the backend, restart PM2.
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-178.104.115.86}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/viva-avtodproc.am}"

echo "Starting redeploy on ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"
echo "Note: SSH auth must be configured (key/agent)."

ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -lc '
set -euo pipefail
cd \"${DEPLOY_PATH}\"

echo \"== repo ==\"
git rev-parse --short HEAD
git status --short || true

echo \"== pull ==\"
git pull --ff-only
echo \"now: \$(git rev-parse --short HEAD) \$(git log -1 --pretty=%s)\"

echo \"== backend install + build ==\"
npm --prefix backend ci --include=dev
npm --prefix backend run build

echo \"== client install ==\"
npm --prefix client ci --include=dev

echo \"== client: marketing (Next) ==\"
npm run build:marketing --prefix client

echo \"== client: app (Vite panel) ==\"
npm run build:app --prefix client

echo \"== restart pm2 ==\"
pm2 restart viva-api viva-web --update-env
pm2 list

echo \"== health ==\"
curl -fsS -o /dev/null -w \"web:%{http_code}\n\" https://viva-avtodproc.am
curl -fsS -o /dev/null -w \"api:%{http_code}\n\" http://127.0.0.1:13101/api/v1/health
'"

echo "Redeploy completed."
