#!/bin/sh
# Backup nightly de Postgres a un directorio fuera de cualquier ruta servida
# por la web (montado desde el host en docker-compose.yml). Dado el tamaño
# pequeño del dataset de PAGE_RUR, un dump comprimido diario con retención
# de 14 días es prácticamente gratis en espacio.
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

# Un dump fallido no se puede reintentar mañana: mañana toca el siguiente, y
# el día perdido se queda perdido. Y falla justo cuando es más probable que
# haga falta — mientras `db` se reinicia, que es cuando este contenedor sigue
# vivo y se encuentra el puerto cerrado o el nombre `db` aún sin resolver.
# Tres intentos separados por un minuto cubren ese arranque sin convertir un
# Postgres realmente caído en un bucle de reintentos.
INTENTOS="${INTENTOS:-3}"
ESPERA_REINTENTO="${ESPERA_REINTENTO:-60}"

run_backup() {
  ts=$(date +%Y%m%d_%H%M%S)
  file="$BACKUP_DIR/rur_${ts}.dump"
  echo "[$(date -Iseconds)] Iniciando backup -> $file"

  intento=1
  while [ "$intento" -le "$INTENTOS" ]; do
    if pg_dump -Fc -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f "$file"; then
      echo "[$(date -Iseconds)] Backup completo: $(du -h "$file" | cut -f1)"
      break
    fi

    # El fichero a medias se borra siempre: dejarlo haría que la retención lo
    # contara como copia buena y que un restore eligiera un dump truncado.
    rm -f "$file"

    if [ "$intento" -lt "$INTENTOS" ]; then
      echo "[$(date -Iseconds)] pg_dump falló (intento $intento/$INTENTOS), reintento en ${ESPERA_REINTENTO}s" >&2
      sleep "$ESPERA_REINTENTO"
    else
      echo "[$(date -Iseconds)] ERROR: pg_dump falló tras $INTENTOS intentos" >&2
    fi
    intento=$((intento + 1))
  done

  find "$BACKUP_DIR" -name 'rur_*.dump' -mtime "+${RETAIN_DAYS}" -delete
}

run_backup
while true; do
  sleep 86400
  run_backup
done
