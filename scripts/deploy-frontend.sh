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
# --user: sin esto el contenedor escribe como root en el bind mount, y la
# release queda con archivos de root. El propio script no puede borrarla luego
# al rotar (Permission denied), así que cada despliegue terminaba en error pese
# a haber publicado bien, y hacía falta un sudo rm a mano.
docker run --rm --user "$(id -u):$(id -g)" -v "$(pwd)/${RELEASE_DIR}:/out" "$IMAGE_TAG" sh -c "cp -r /app/dist/. /out/"

if [ ! -f "${RELEASE_DIR}/index.html" ]; then
  echo "ERROR: el build no generó index.html, no se actualiza 'current'." >&2
  rm -rf "$RELEASE_DIR"
  exit 1
fi

echo "==> Swap atómico de dist-releases/current -> ${RELEASE_ID}"
ln -sfn "$RELEASE_ID" dist-releases/current.tmp
mv -Tf dist-releases/current.tmp dist-releases/current

# Best-effort: para cuando se llega aquí el swap atómico ya publicó la release
# nueva, así que un fallo borrando las viejas no debe abortar por el set -e ni
# hacer que el script salga con error. Solo se avisa.
echo "==> Limpiando releases viejas (conservando las últimas 5)..."
if ! (cd dist-releases && ls -1dt */ 2>/dev/null | grep -v '^current' | tail -n +6 | xargs -r rm -rf); then
  echo "AVISO: quedaron releases viejas sin borrar (probablemente archivos de otro usuario)." >&2
  echo "       La release nueva SÍ se publicó correctamente." >&2
fi

echo "Desplegado: ${RELEASE_DIR} (dist-releases/current -> $(readlink dist-releases/current))"
