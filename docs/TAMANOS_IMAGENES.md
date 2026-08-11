# Qué tamaño subir en cada imagen

Medido sobre el sitio en producción con un navegador real, a siete anchos de
ventana (1920, 1440, 1280, 1024, 820, 480 y 390 px). No son medidas del diseño:
son las que salen al renderizar.

## Resumen

| Dónde | Sube | ¿Se recorta? |
|---|---|---|
| **Portada de una publicación** (tarjetas y archivo) | **1800 × 1013** (16:9) | **No**, si respetas 16:9 |
| **Portada de la página de inicio** | **1800 × 658** | Sí, por los lados |
| **Foto de perfil** | **400 × 400** | Sí, las esquinas (es un círculo) |

Solo hay **tres tamaños** que recordar, y el primero cubre todas las
publicaciones.

## Portadas de publicación — 16:9, y ya está

Todas las portadas de publicación —la tarjeta grande de la portada, las de la
rejilla y las del archivo— tienen la **proporción fija en 16:9**. El hueco
cambia de tamaño según la pantalla, pero **nunca de forma**.

Consecuencia práctica: **si subes una imagen 16:9, se ve entera siempre**, en
cualquier dispositivo. No hay nada que encuadrar ni zona segura que respetar.
1800 × 1013 es 16:9 al ancho máximo que acepta el servidor.

> Esto no era así. Hasta el 10 de agosto de 2026 estos huecos tenían el **alto
> fijo** y el ancho a merced del texto de al lado (`flex: 1 1 300px`), de modo
> que iban de 358 a 904 px de ancho manteniendo 300 de alto: la misma foto se
> recortaba de manera distinta en cada pantalla y era imposible encuadrarla.
> Ahora la forma manda y el recorte desapareció.

## Portada de la página de inicio — aquí sí hay que encuadrar

Es la única que va a sangre, de borde a borde de la ventana, y por eso su forma
**sí cambia**: de 2,74:1 en un monitor a 0,70:1 en un móvil vertical. No se
puede fijar sin romper la página, porque tiene que llenar la ventana sea cual
sea.

Lo que implica al elegir la foto:

- Sube **1800 × 658**.
- **En móvil solo se ve el 25% central del ancho.** Lo importante, centrado.
- Nunca se recorta por arriba ni por abajo, solo por los lados.

## Foto de perfil — cuadrada

400 × 400. Se muestra dentro de un círculo, así que las cuatro esquinas se
pierden siempre: encuadra la cara centrada y sin apurar los bordes.

## El tope del servidor

Al subir, el servidor **reduce cualquier imagen a 1800 px de ancho** y la
convierte a WebP con calidad 82, quitando de paso los metadatos de la cámara
(incluida la ubicación GPS).

- **Subir más de 1800 px de ancho no sirve de nada**: se reduce igual.
- No conviertas nada a mano: sube el JPG o PNG tal cual.
- El límite es 25 MB, pero con 2 MB vas sobrado.
- **Nunca se amplía una imagen pequeña.** Si subes 400 px de ancho para la
  portada de inicio, se verá borrosa; el servidor no la arregla.

## Plantillas

Hay marcos listos en Figma, en el archivo RUR, página **«Plantillas de imagen ·
Web»**: arrastras la foto dentro, la ajustas y exportas.

## Cómo comprobarlo tú

Las medidas salen de un script que abre el sitio real y mide cada hueco a
distintos anchos. Si cambia un diseño, se vuelve a medir en vez de suponer:
abre la web en el navegador, `F12`, y en la consola:

```js
// Proporción de cada hueco de imagen en la página actual
[...document.querySelectorAll('img, [style*="aspect-ratio"]')]
  .map(e => { const b = e.getBoundingClientRect();
    return `${Math.round(b.width)}x${Math.round(b.height)} → ${(b.width/b.height).toFixed(2)}:1`; });
```

Repítelo estrechando la ventana. Si un hueco cambia de proporción, esa imagen
necesita encuadre; si no cambia, basta con subirla en su proporción.
