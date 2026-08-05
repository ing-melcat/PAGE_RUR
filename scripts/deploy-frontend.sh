#!/bin/bash
# Construye el SPA y lo publica en dist-releases/ con swap atómico de symlink,
# sin tocar el contenedor de Caddy. Caddy sirve dist-releases/current (un
# symlink dentro del volumen montado), así que el cambio es instantáneo y sin
# downtime: nunca hay una ventana donde el directorio esté a medio escribir.
#
# Mantiene las últimas 5 releases para poder hacer rollback manual con:
#   ln -sfn <release-anterior> dist-releases/current
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE_TAG="page_rur-frontend-build:latest"
RELEASE_ID="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="dist-releases/${RELEASE_ID}"

mkdir -p "$RELEASE_DIR"

echo "==> Construyendo imagen de build del frontend..."
docker build -f Dockerfile.frontend -t "$IMAGE_TAG" .

echo "==> Extrayendo dist/ a ${RELEASE_DIR}..."
docker run --rm -v "$(pwd)/${RELEASE_DIR}:/out" "$IMAGE_TAG" sh -c "cp -r /app/dist/. /out/"

if [ ! -f "${RELEASE_DIR}/index.html" ]; then
  echo "ERROR: el build no generó index.html, no se actualiza 'current'." >&2
  rm -rf "$RELEASE_DIR"
  exit 1
fi

echo "==> Swap atómico de dist-releases/current -> ${RELEASE_ID}"
ln -sfn "$RELEASE_ID" dist-releases/current.tmp
mv -Tf dist-releases/current.tmp dist-releases/current

echo "==> Limpiando releases viejas (conservando las últimas 5)..."
(cd dist-releases && ls -1dt */ 2>/dev/null | grep -v '^current' | tail -n +6 | xargs -r rm -rf)

echo "Desplegado: ${RELEASE_DIR} (dist-releases/current -> $(readlink dist-releases/current))"
