#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-178.104.115.86}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/viva-avtodproc.am}"

echo "Starting redeploy on ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"
echo "Note: SSH auth must be configured (key/agent)."

ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -lc '
set -euo pipefail
cd \"${DEPLOY_PATH}\"

echo \"== repo status ==\"
git status --short || true

echo \"== pull latest ==\"
git pull --ff-only

echo \"== backend build ==\"
npm --prefix backend ci
npm --prefix backend run build

echo \"== client install/build ==\"
npm --prefix client ci
npm run build:all --prefix client

echo \"== restart pm2 ==\"
pm2 restart viva-api
pm2 restart viva-web

echo \"== pm2 list ==\"
pm2 list

echo \"== health checks ==\"
curl -sS -o /dev/null -w \"web:%{http_code}\n\" https://viva-avtodproc.am
curl -sS -o /dev/null -w \"api:%{http_code}\n\" http://127.0.0.1:13101/api/v1/health || true
'"

echo "Redeploy completed."
