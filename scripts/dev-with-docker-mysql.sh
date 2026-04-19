#!/usr/bin/env bash
# Start MySQL in Docker only, then run API + panel (Vite) + marketing (Next) on the host.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! docker compose up -d db; then
  echo >&2
  echo "If the error was a port bind failure on 3306, another service is using that port." >&2
  echo "Set MYSQL_PUBLISH_PORT to a free port in a project-root .env (see .env.example), then" >&2
  echo "set MYSQL_PORT to the same value in backend/.env for local API → Docker MySQL." >&2
  exit 1
fi

echo "Waiting for MySQL to accept connections..."
for i in $(seq 1 90); do
  if docker compose exec -T db sh -c 'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' 2>/dev/null; then
    echo "MySQL is ready."
    break
  fi
  if [ "$i" -eq 90 ]; then
    echo "MySQL did not become ready in time." >&2
    exit 1
  fi
  sleep 1
done

# Backend: same MySQL host/port/password as the compose `db` service. Exported vars win over
# backend/.env (dotenv does not override existing process.env).

read_env_value() {
  local file="$1" key="$2"
  if [ ! -f "$file" ]; then
    printf ''
    return 0
  fi
  grep -E "^[[:space:]]*${key}=" "$file" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' | sed "s/^['\"]//;s/['\"]$//" || true
}

# Password: env → backend/.env → Docker root password (never use doc template literals).
_mysql_pw="${MYSQL_PASSWORD-}"
if [ -z "$_mysql_pw" ]; then
  _mysql_pw="$(read_env_value "$ROOT/backend/.env" MYSQL_PASSWORD)"
fi
_mysql_pw_lc="$(printf '%s' "$_mysql_pw" | tr '[:upper:]' '[:lower:]')"
case "$_mysql_pw_lc" in
  '' | your_mysql_password | changeme)
    _mysql_pw=''
    ;;
esac
if [ -z "$_mysql_pw" ]; then
  _root_pw="${MYSQL_ROOT_PASSWORD-}"
  [ -z "$_root_pw" ] && _root_pw="$(read_env_value "$ROOT/.env" MYSQL_ROOT_PASSWORD)"
  _mysql_pw="${_root_pw:-viva_root}"
fi

# Port: env → backend/.env → same host port Docker publishes (MYSQL_PUBLISH_PORT) → 3306.
_mysql_port="${MYSQL_PORT-}"
if [ -z "$_mysql_port" ]; then
  _mysql_port="$(read_env_value "$ROOT/backend/.env" MYSQL_PORT)"
fi
if [ -z "$_mysql_port" ]; then
  _publish="${MYSQL_PUBLISH_PORT-}"
  [ -z "$_publish" ] && _publish="$(read_env_value "$ROOT/.env" MYSQL_PUBLISH_PORT)"
  _mysql_port="${_publish:-3306}"
fi

echo "Starting API with MYSQL_HOST=127.0.0.1 MYSQL_PORT=${_mysql_port} (password from compose / .env)."

pids=()
(
  cd "$ROOT/backend" &&
    export MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}" \
      MYSQL_PORT="$_mysql_port" \
      MYSQL_PASSWORD="$_mysql_pw" &&
    yarn dev
) & pids+=($!)
(cd "$ROOT/client" && yarn dev) & pids+=($!)
(cd "$ROOT/client" && yarn dev:web) & pids+=($!)

cleanup() {
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup INT TERM
wait || true
cleanup
