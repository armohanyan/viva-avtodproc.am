#!/usr/bin/env bash
# Daily MySQL backup for viva database.
# Install: copy to /usr/local/bin/viva-mysql-backup.sh, chmod +x, add cron (see README in ops).
set -euo pipefail

BACKUP_DIR="${VIVA_BACKUP_DIR:-/var/backups/viva-mysql}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_DATABASE="${MYSQL_DATABASE:-viva}"
RETENTION_DAYS="${VIVA_BACKUP_RETENTION_DAYS:-14}"
CREDS_FILE="${MYSQL_CREDENTIALS_FILE:-/root/.viva-mysql-backup.cnf}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y-%m-%d_%H%M%S)"
OUT="$BACKUP_DIR/viva_${STAMP}.sql.gz"

if [[ ! -f "$CREDS_FILE" ]]; then
  echo "Missing credentials file: $CREDS_FILE" >&2
  exit 1
fi

mysqldump \
  --defaults-extra-file="$CREDS_FILE" \
  --single-transaction \
  --routines \
  --triggers \
  --databases "$MYSQL_DATABASE" \
  | gzip -9 > "$OUT"

find "$BACKUP_DIR" -name 'viva_*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -delete

echo "backup_ok file=$OUT size=$(du -h "$OUT" | awk '{print $1}')"
