#!/bin/sh
set -e
host="${MYSQL_HOST:-db}"
port="${MYSQL_PORT:-3306}"
echo "Waiting for MySQL at ${host}:${port}..."
i=0
while ! nc -z "$host" "$port"; do
  i=$((i + 1))
  if [ "$i" -gt 120 ]; then
    echo "MySQL did not become ready in time."
    exit 1
  fi
  sleep 1
done
echo "MySQL is up — starting API."
exec "$@"
