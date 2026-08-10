// Traducción automática (LibreTranslate autohospedado) del contenido que
// escribe el redactor -- Fase B del selector de idioma. La tabla `posts`
// nunca se toca aquí: lo que el redactor edita en el panel es siempre el
// español original. Las traducciones viven en post_translations, cacheadas
// por (post_id, lang), y se invalidan cuando el post se edita o se borra.
import { parse, NodeType } from 'node-html-parser';
import { getPool } from '../shared/db.js';

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://libretranslate:5000';
const IDIOMA_ORIGEN = 'es';

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

/**
 * Devuelve el post con title/content/pages en `lang`. Si hay una traducción
 * cacheada en post_translations, la devuelve de inmediato (~1 ms). Si NO la
 * hay, devuelve el post ORIGINAL sin traducir y lanza la traducción en
 * segundo plano (fire-and-forget): la próxima petición ya encontrará la
 * caché lista.
 *
 * ¿Por qué no esperar a que termine la traducción? Porque LibreTranslate
 * puede tardar varios segundos por post (o hacer timeout), y la petición GET
 * /api/posts traduce TODOS los posts en paralelo. Con 7 publicaciones, un
 * solo timeout de 5 s convertía una respuesta de 40 ms en una de >5 s,
 * dejando la página colgada cada vez que alguien la abre en inglés.
 *
 * El resultado es que la primera visita en un idioma no-nativo muestra el
 * contenido original. Los posts cortos quedan listos en segundos; el más
 * largo que hay (7 páginas, 149 nodos de texto) tarda ~4.5 min medidos en
 * este hardware. Pero solo pasa UNA vez por post e idioma: en cuanto termina
 * queda cacheado y todas las visitas siguientes salen traducidas al
 * instante.
 */
export async function traducirPost(post, lang) {
  try {
    const { rows } = await pool.query(
      'SELECT title, content, pages FROM post_translations WHERE post_id = $1 AND lang = $2',
      [post.id, lang]
    );
    if (rows.length > 0) {
      const cache = rows[0];
      return {
        ...post,
        title: cache.title ?? post.title,
        content: cache.content ?? post.content,
        pages: (cache.pages && cache.pages.length > 0) ? cache.pages : post.pages,
      };
    }

    programarTraduccion(post, lang);
    return post;
  } catch (err) {
    console.error(`[svc-content] Error leyendo caché de traducción de ${post.id}:`, err.message);
    return post;
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

// Se llama al editar o borrar un post: la traducción cacheada de la versión
// vieja ya no aplica. No hace falta regenerarla aquí -- se rehace sola, de
// forma perezosa, la próxima vez que alguien la pida en ese idioma.
export async function invalidarTraducciones(postId) {
  await pool.query('DELETE FROM post_translations WHERE post_id = $1', [postId]);
}
