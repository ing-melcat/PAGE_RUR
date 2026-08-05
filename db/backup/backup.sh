#!/bin/sh
# Backup nightly de Postgres a un directorio fuera de cualquier ruta servida
# por la web (montado desde el host en docker-compose.yml). Dado el tamaño
# pequeño del dataset de PAGE_RUR, un dump comprimido diario con retención
# de 14 días es prácticamente gratis en espacio.
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

run_backup() {
  ts=$(date +%Y%m%d_%H%M%S)
  file="$BACKUP_DIR/rur_${ts}.dump"
  echo "[$(date -Iseconds)] Iniciando backup -> $file"
  if pg_dump -Fc -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f "$file"; then
    echo "[$(date -Iseconds)] Backup completo: $(du -h "$file" | cut -f1)"
  else
    echo "[$(date -Iseconds)] ERROR: pg_dump falló" >&2
    rm -f "$file"
  fi
  find "$BACKUP_DIR" -name 'rur_*.dump' -mtime "+${RETAIN_DAYS}" -delete
}

run_backup
while true; do
  sleep 86400
  run_backup
done
