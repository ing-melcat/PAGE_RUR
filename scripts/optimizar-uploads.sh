#!/bin/bash
# Reduce las imágenes YA subidas por el CMS.
#
# La reducción automática al subir solo actúa sobre lo nuevo; esto es la pasada
# única para lo que ya está en uploads/.
#
# NO cambia nombres ni extensiones, a propósito. Convertir a WebP ahorraría un
# punto o dos más, pero las URLs de esos archivos están escritas dentro de las
# publicaciones —en `image`, en el HTML de `content` y en el JSONB de `pages`—
# y renombrarlas obligaría a reescribir la base de datos buscando cadenas por
# tres sitios. Recomprimir en el mismo formato da el 96% del ahorro con cero
# riesgo de romper una imagen publicada.
#
# Hace copia de seguridad antes de tocar nada. Si algo sale mal:
#   rm -rf uploads && mv uploads.respaldo-<fecha> uploads
set -euo pipefail
cd "$(dirname "$0")/.."

ORIGEN="uploads"
RESPALDO="uploads.respaldo-$(date +%Y%m%d%H%M%S)"
ANCHO=1800
CALIDAD=82

if [ ! -d "$ORIGEN" ]; then
  echo "ERROR: no existe $ORIGEN" >&2
  exit 1
fi

echo "==> Copia de seguridad en $RESPALDO"
cp -r "$ORIGEN" "$RESPALDO"

echo "==> Reduciendo (máx ${ANCHO}px, calidad ${CALIDAD})..."

# Se ejecuta dentro del contenedor de contenido, que es quien tiene sharp
# instalado: así no hace falta nada en el host.
docker exec -i "${CONTENEDOR:-page_rur-svc-content-1}" node -e '
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const DIR = process.env.UPLOADS_DIR || "/app/services/content/uploads";
const ANCHO = 1800;
const CALIDAD = 82;

(async () => {
  let total = 0, ahorrado = 0, tocados = 0;

  for (const nombre of fs.readdirSync(DIR)) {
    // GIF fuera: puede ser animado y recomprimirlo lo dejaría congelado.
    if (!/\.(jpe?g|png|webp)$/i.test(nombre)) continue;

    const ruta = path.join(DIR, nombre);
    const antes = fs.statSync(ruta).size;
    total += antes;

    try {
      const img = sharp(ruta).rotate().resize({ width: ANCHO, withoutEnlargement: true });
      const ext = path.extname(nombre).toLowerCase();
      const salida =
        ext === ".png"  ? img.png({ compressionLevel: 9, palette: true }) :
        ext === ".webp" ? img.webp({ quality: CALIDAD }) :
                          img.jpeg({ quality: CALIDAD, mozjpeg: true });

      const buffer = await salida.toBuffer();

      // Solo se sustituye si de verdad se gana: recomprimir una imagen ya
      // optimizada puede dejarla MÁS pesada, y entonces no compensa perder
      // calidad a cambio de nada.
      if (buffer.length < antes * 0.95) {
        fs.writeFileSync(ruta, buffer);
        ahorrado += antes - buffer.length;
        tocados++;
        console.log(`  ${nombre}: ${Math.round(antes/1024)} KB → ${Math.round(buffer.length/1024)} KB`);
      }
    } catch (e) {
      console.log(`  ${nombre}: se deja como está (${e.message})`);
    }
  }

  console.log("");
  console.log(`Imágenes reducidas: ${tocados}`);
  console.log(`Espacio liberado  : ${Math.round(ahorrado/1024/1024 * 10)/10} MB de ${Math.round(total/1024/1024 * 10)/10} MB`);
})();
'

echo ""
echo "Listo. Copia de seguridad en $RESPALDO (bórrala cuando compruebes que todo se ve bien)."
