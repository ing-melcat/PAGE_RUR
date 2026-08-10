// Traducción automática (LibreTranslate autohospedado) del contenido que
// escribe el redactor -- Fase B del selector de idioma. La tabla `posts`
// nunca se toca aquí: lo que el redactor edita en el panel es siempre el
// español original. Las traducciones viven en post_translations, cacheadas
// por (post_id, lang), y se invalidan cuando el post se edita o se borra.
import { parse, NodeType } from 'node-html-parser';
import { getPool } from '../shared/db.js';

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://libretranslate:5000';
const IDIOMA_ORIGEN = 'es';

// Los idiomas a los que se traduce al guardar una publicación. Hoy el
// selector del sitio solo ofrece es/en (src/lib/i18n.tsx) y LibreTranslate
// arranca con `--load-only en,es`; añadir uno aquí exige cargar también su
// modelo en el contenedor.
const IDIOMAS_TRADUCIBLES = ['en'];

// LibreTranslate acepta `q` como arreglo y responde con otro arreglo en el
// mismo orden. Es la diferencia entre 4 peticiones y 150: el post más largo
// que hay (7 páginas) tiene 149 nodos de texto, y antes cada uno abría su
// propia conexión -- 150 peticiones simultáneas contra los 4 workers de
// gunicorn, que se atropellaban entre ellas.
const LOTE_MAX_TEXTOS = 40;

// De uno en uno, a propósito. CTranslate2 (el motor bajo Argos) ya reparte
// una sola traducción entre varios hilos y por sí sola satura el tope de 2
// CPUs del contenedor: el cuello es la CPU, no el número de conexiones.
// Mandar dos lotes a la vez no reparte el trabajo, lo hace competir -- cada
// uno avanza a la mitad de velocidad y ambos se acercan al timeout sin que
// el total termine antes.
const PETICIONES_EN_PARALELO = 1;

// Muy holgado a propósito: esto corre en segundo plano y nadie espera la
// respuesta, así que el timeout ya no es un plazo de entrega sino solo el
// seguro para que un LibreTranslate colgado no deje la tarea viva para
// siempre. Un lote lleno tarda ~70 s cuando el traductor está libre, pero
// si hay otra traducción en curso puede irse al doble o más, y cortar por
// impaciencia es justamente lo que montaba el bucle.
//
// El valor viejo (5 s) era la causa: traducir el post largo cuesta ~4.5
// min, así que el timeout saltaba SIEMPRE, no se cacheaba nada, y la visita
// siguiente lo reintentaba desde cero -- dejando de paso a LibreTranslate
// triturando durante minutos un resultado que ya nadie iba a recibir.
const TIMEOUT_LOTE_MS = 600000;

const pool = getPool();

function esTodoMayusculas(texto) {
  return texto === texto.toUpperCase() && texto !== texto.toLowerCase();
}

// Un único carril de salida hacia LibreTranslate para todo el servicio: por
// muchos posts que entren a traducirse a la vez, nunca se le mandan más de
// PETICIONES_EN_PARALELO lotes simultáneos.
let enVuelo = 0;
const enEspera = [];

async function conCupo(tarea) {
  if (enVuelo >= PETICIONES_EN_PARALELO) {
    await new Promise((liberar) => enEspera.push(liberar));
  }
  enVuelo++;
  try {
    return await tarea();
  } finally {
    enVuelo--;
    const siguiente = enEspera.shift();
    if (siguiente) siguiente();
  }
}

async function pedirLote(textos, destino) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_LOTE_MS);
  let res;
  try {
    res = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: textos, source: IDIOMA_ORIGEN, target: destino, format: 'text' }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) throw new Error(`LibreTranslate respondió ${res.status}`);
  const data = await res.json();
  const salida = data.translatedText;
  if (!Array.isArray(salida) || salida.length !== textos.length) {
    throw new Error(
      `LibreTranslate devolvió ${Array.isArray(salida) ? salida.length : 'no-arreglo'} para ${textos.length} textos`
    );
  }
  return salida;
}

// Salvaguarda contra salidas degeneradas del motor: si no queda ninguna
// letra, mejor mostrar el original sin traducir que basura.
function aceptarTraduccion(original, traducido) {
  if (typeof traducido !== 'string') return original;
  if (original.trim().length > 2 && !/[a-zA-Z]/.test(traducido)) return original;
  return traducido;
}

/**
 * Traduce un arreglo de cadenas y devuelve otro del mismo largo y en el
 * mismo orden. Las vacías o en blanco se devuelven tal cual, sin gastar una
 * llamada al traductor.
 */
async function traducirTextos(textos, destino) {
  const resultado = [...textos];

  // Argos/LibreTranslate devuelve salidas basura (ej. "_") con palabras
  // sueltas en MAYÚSCULAS -- en formato normal traduce bien ("Prueba" ->
  // "Test"). Los títulos que usan esto se muestran igual en mayúsculas por
  // CSS (text-transform: uppercase), así que no se pierde nada visualmente
  // al mandar a traducir la versión no-mayúscula.
  const indices = [];
  const aTraducir = [];
  textos.forEach((texto, i) => {
    if (typeof texto !== 'string' || !texto.trim()) return;
    indices.push(i);
    aTraducir.push(esTodoMayusculas(texto) ? texto.charAt(0) + texto.slice(1).toLowerCase() : texto);
  });
  if (aTraducir.length === 0) return resultado;

  const inicios = [];
  for (let i = 0; i < aTraducir.length; i += LOTE_MAX_TEXTOS) {
    inicios.push(i);
  }

  await Promise.all(
    inicios.map((desde) =>
      conCupo(async () => {
        const trozo = aTraducir.slice(desde, desde + LOTE_MAX_TEXTOS);
        const traducidos = await pedirLote(trozo, destino);
        traducidos.forEach((traducido, j) => {
          const original = indices[desde + j];
          resultado[original] = aceptarTraduccion(textos[original], traducido);
        });
      })
    )
  );

  return resultado;
}

// Recorre el árbol y junta solo los nodos de TEXTO -- nunca las etiquetas ni
// sus atributos (incluido cualquier style="" a mano). Es la única forma
// segura de traducir HTML libre: mandarlo entero como una cadena al
// traductor es como se corrompen las etiquetas.
function recolectarNodosDeTexto(elemento, acumulado = []) {
  for (const hijo of elemento.childNodes) {
    if (hijo.nodeType === NodeType.TEXT_NODE) {
      acumulado.push(hijo);
    } else if (hijo.nodeType === NodeType.ELEMENT_NODE) {
      recolectarNodosDeTexto(hijo, acumulado);
    }
  }
  return acumulado;
}

function analizarHtml(html) {
  return html && html.trim() ? parse(html) : null;
}

function aplicarCache(post, cache) {
  return {
    ...post,
    title: cache.title ?? post.title,
    content: cache.content ?? post.content,
    pages: (cache.pages && cache.pages.length > 0) ? cache.pages : post.pages,
  };
}

/**
 * Devuelve la lista de posts en `lang`, leyendo las traducciones ya hechas.
 * NO traduce nada: para cuando llega un visitante el trabajo ya está hecho
 * (se dispara al guardar la publicación, ver regenerarTraducciones).
 *
 * Una sola consulta para toda la lista. Antes se hacía una por post -- con 7
 * publicaciones eran 8 consultas por visita, y crecía con cada publicación
 * nueva.
 *
 * Si aun así faltara alguna traducción (una publicación creada antes de que
 * esto existiera, o un LibreTranslate que estaba caído al guardar), se
 * devuelve el original y se programa la traducción de fondo: red de
 * seguridad, no el camino normal.
 */
export async function adjuntarTraducciones(posts, lang) {
  if (!posts.length || !lang || lang === IDIOMA_ORIGEN) return posts;

  try {
    const { rows } = await pool.query(
      'SELECT post_id, title, content, pages FROM post_translations WHERE lang = $1 AND post_id = ANY($2)',
      [lang, posts.map((post) => post.id)]
    );
    const porId = new Map(rows.map((fila) => [fila.post_id, fila]));

    return posts.map((post) => {
      const cache = porId.get(post.id);
      if (cache) return aplicarCache(post, cache);
      programarTraduccion(post, lang);
      return post;
    });
  } catch (err) {
    console.error(`[svc-content] Error leyendo la caché de traducciones a "${lang}":`, err.message);
    return posts;
  }
}

/**
 * Traduce y persiste en post_translations. Se ejecuta en segundo plano,
 * fuera del ciclo de vida de la petición HTTP que la disparó.
 *
 * Junta el título, el contenido y todas las páginas en UNA sola tanda de
 * textos antes de trocear: así los lotes van llenos en vez de quedarse a
 * medias en cada campo por separado.
 */
async function traducirYCachear(post, lang) {
  const raizContenido = analizarHtml(post.content);
  const paginas = post.pages || [];
  const raicesPaginas = paginas.map((pagina) => analizarHtml(pagina.content));

  const nodos = [];
  for (const raiz of [raizContenido, ...raicesPaginas]) {
    if (raiz) nodos.push(...recolectarNodosDeTexto(raiz));
  }
  const nodosConTexto = nodos.filter((nodo) => nodo.rawText && nodo.rawText.trim());

  // El título va de primero para poder separarlo del resto al volver.
  const traducidos = await traducirTextos(
    [post.title, ...nodosConTexto.map((nodo) => nodo.rawText)],
    lang
  );

  const tituloTraducido = traducidos[0];
  nodosConTexto.forEach((nodo, i) => {
    nodo.rawText = traducidos[i + 1];
  });

  const contenidoTraducido = raizContenido ? raizContenido.toString() : post.content;
  const paginasTraducidas = paginas.map((pagina, i) => ({
    ...pagina,
    content: raicesPaginas[i] ? raicesPaginas[i].toString() : pagina.content,
  }));

  await pool.query(
    `INSERT INTO post_translations (post_id, lang, title, content, pages)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (post_id, lang) DO UPDATE
       SET title = $3, content = $4, pages = $5::jsonb, translated_at = now()`,
    [post.id, lang, tituloTraducido, contenidoTraducido, JSON.stringify(paginasTraducidas)]
  );
}

// El candado que impide repetir trabajo ya en marcha: mientras un (post,
// idioma) se está traduciendo, las visitas que lleguen entretanto se van con
// el original y NO encolan una segunda traducción del mismo post.
//
// Sin esto, hacer la traducción en segundo plano le quita el freno al
// problema en vez de arreglarlo: como ya nadie espera la respuesta, cada
// visita en inglés apilaba otra tanda completa encima de la anterior,
// durante los minutos que dura el trabajo.
const enCurso = new Set();

function programarTraduccion(post, lang) {
  const clave = `${post.id}:${lang}`;
  if (enCurso.has(clave)) return;
  enCurso.add(clave);

  traducirYCachear(post, lang)
    .catch((err) => {
      console.error(`[svc-content] No se pudo traducir el post ${post.id} a "${lang}":`, err.message);
    })
    .finally(() => {
      enCurso.delete(clave);
    });
}

// Se llama al borrar un post: su traducción ya no le sirve a nadie.
export async function invalidarTraducciones(postId) {
  await pool.query('DELETE FROM post_translations WHERE post_id = $1', [postId]);
}

/**
 * Se llama al CREAR o EDITAR una publicación: tira la traducción vieja (que
 * ya no corresponde al texto nuevo) y encarga la nueva ahí mismo, en segundo
 * plano.
 *
 * Este es el punto donde debe ocurrir el trabajo. Antes se hacía de forma
 * perezosa -- se borraba al editar y se regeneraba cuando el primer visitante
 * pedía ese idioma -- y eso ponía el coste en el lado equivocado: quien
 * pagaba el retraso era el visitante, y encima veía la publicación en español
 * habiendo pedido inglés. Guardar pasa unas pocas veces al día y lo hace
 * alguien que ya está esperando a que se guarde; una visita pasa
 * constantemente y tiene que ser instantánea.
 *
 * No se espera a que termine: el redactor recibe su respuesta de guardado
 * enseguida y la traducción avanza por detrás.
 */
export async function regenerarTraducciones(post) {
  await pool.query('DELETE FROM post_translations WHERE post_id = $1', [post.id]);
  for (const lang of IDIOMAS_TRADUCIBLES) {
    programarTraduccion(post, lang);
  }
}

// LibreTranslate tarda en cargar los modelos de idioma, y en un `docker
// compose up` arranca a la vez que este servicio: sin esperarlo, el
// precalentado de abajo falla entero con "fetch failed" y las traducciones
// se quedan sin hacer hasta el siguiente arranque.
const ESPERA_ENTRE_SONDEOS_MS = 5000;
const SONDEOS_MAX = 24; // ~2 minutos

async function esperarAlTraductor() {
  for (let intento = 0; intento < SONDEOS_MAX; intento++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${LIBRETRANSLATE_URL}/languages`, { signal: controller.signal });
      if (res.ok) return true;
    } catch {
      // Todavía no responde: se reintenta abajo.
    } finally {
      clearTimeout(timeoutId);
    }
    await new Promise((seguir) => setTimeout(seguir, ESPERA_ENTRE_SONDEOS_MS));
  }
  return false;
}

/**
 * Al arrancar el servicio, completa lo que falte. Cubre el hueco de las
 * publicaciones que ya existían antes de que la traducción se hiciera al
 * guardar, y el de un guardado cuyo LibreTranslate estaba caído.
 *
 * Va de una en una (manda PETICIONES_EN_PARALELO), así que aunque falten
 * todas no se le echa encima al traductor de golpe.
 */
export async function precalentarTraducciones() {
  const pendientes = {};
  for (const lang of IDIOMAS_TRADUCIBLES) {
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.content, p.pages
         FROM posts p
         LEFT JOIN post_translations t ON t.post_id = p.id AND t.lang = $1
        WHERE t.post_id IS NULL`,
      [lang]
    );
    if (rows.length > 0) pendientes[lang] = rows;
  }
  if (Object.keys(pendientes).length === 0) return;

  const total = Object.values(pendientes).reduce((suma, rows) => suma + rows.length, 0);
  console.log(`[svc-content] Faltan ${total} traducciones: esperando a LibreTranslate para generarlas.`);

  if (!(await esperarAlTraductor())) {
    console.error('[svc-content] LibreTranslate no respondió; las traducciones pendientes quedan para el próximo arranque.');
    return;
  }

  for (const [lang, rows] of Object.entries(pendientes)) {
    for (const post of rows) {
      programarTraduccion(post, lang);
    }
  }
  console.log(`[svc-content] Generando ${total} traducciones en segundo plano.`);
}
