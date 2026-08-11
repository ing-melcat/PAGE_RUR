# Qué tamaño subir en cada imagen

Medido sobre el sitio en producción con un navegador real, a siete anchos de
ventana (1920, 1440, 1280, 1024, 820, 480 y 390 px). No son medidas del diseño:
son las que salen al renderizar.

## Lo primero, dos reglas que lo explican casi todo

**1. El alto es fijo; el ancho cambia.** En todos los huecos el alto está
clavado en el CSS y el ancho depende de la ventana, de cuántas columnas quepan
y de la longitud del título. Por eso una misma foto se ve más o menos recortada
**por los lados** según el dispositivo, nunca por arriba y abajo.

**2. Todas recortan** (`object-fit: cover`): la imagen se amplía hasta cubrir el
hueco y lo que sobra se corta, sin deformarse nunca. La consecuencia práctica:

> **Deja aire a los lados y pon lo importante en el centro.** Una cara pegada al
> borde izquierdo desaparece en cuanto la tarjeta se estrecha.

## Tamaños

| Dónde | Alto fijo | Ancho (mín – máx) | Proporción | **Sube** |
|---|---|---|---|---|
| Portada de la página de inicio | 702 px (560 en móvil) | 390 – 1920 | ~2,7:1 | **1800 × 658** |
| Portada en tarjeta destacada | 300 px | 358 – 904 | ~3:1 | **1800 × 600** |
| Portada en tarjeta de rejilla | 180 px | 332 – 446 | ~2,5:1 | **900 × 360** |
| Foto de perfil | 130 px (46 en la tarjeta) | cuadrada | 1:1 | **400 × 400** |

Notas de cada una:

- **Portada de inicio**: es la única a sangre, de borde a borde de la ventana.
  En móvil baja a 560 px de alto y se estrecha muchísimo, así que el sujeto
  tiene que estar centrado o se pierde.
- **Tarjeta destacada**: su ancho es el que más baila —de 358 a 904 px— porque
  comparte fila con el texto. Es donde más se nota el recorte lateral.
- **Tarjeta de rejilla**: la más pequeña. Un 900 × 360 ya va sobrado.
- **Foto de perfil**: cuadrada, y se ve dentro de un círculo. Las esquinas se
  pierden siempre: encuadra la cara centrada y sin apurar los bordes.

## El tope del servidor

Al subir, el servidor **reduce cualquier imagen a 1800 px de ancho** y la
convierte a WebP con calidad 82, quitando de paso los metadatos de la cámara
(incluida la ubicación GPS). Así que:

- **Subir más de 1800 px de ancho no sirve de nada**: se reduce igual.
- No hace falta que conviertas nada a mano: sube el JPG o PNG tal cual.
- El límite de subida es de 25 MB, pero una foto de 2 MB ya es de sobra.
- Nunca se amplía una imagen pequeña. Si subes 400 px de ancho para la portada
  de inicio, se verá borrosa; el servidor no la arregla.

## Por qué los tamaños recomendados son el doble

Una pantalla de móvil o un portátil moderno pinta dos píxeles físicos por cada
píxel de CSS. Una imagen de exactamente 904 px para un hueco de 904 px se ve
suave en un monitor viejo y algo borrosa en cualquier pantalla actual. De ahí el
doble — salvo cuando eso pasa de 1800 y el servidor lo recorta igual.

## Cómo comprobarlo tú

Las medidas salen de un script que abre el sitio real y mide cada hueco a
distintos anchos. Si cambia un diseño, se vuelve a medir en vez de suponer:

```bash
# Con el navegador headless que ya se usa para revisar la web
docker run --rm --network host \
  -v "$PWD/medir.js:/usr/src/app/medir.js:ro" \
  --entrypoint node zenika/alpine-chrome:with-puppeteer /usr/src/app/medir.js
```

Lo que mide de cada hueco: ancho y alto renderizados a cada resolución, si
recorta o no, y si la imagen llega a cargar.
