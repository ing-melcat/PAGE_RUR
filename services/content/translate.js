// Traducción automática (LibreTranslate autohospedado) del contenido que
// escribe el redactor -- Fase B del selector de idioma. La tabla `posts`
// nunca se toca aquí: lo que el redactor edita en el panel es siempre el
// español original. Las traducciones viven en post_translations, cacheadas
// por (post_id, lang), y se invalidan cuando el post se edita o se borra.
import { parse, NodeType } from 'node-html-parser';
import { getPool } from '../shared/db.js';

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://libretranslate:5000';
const IDIOMA_ORIGEN = 'es';

const pool = getPool();

function esTodoMayusculas(texto) {
  return texto === texto.toUpperCase() && texto !== texto.toLowerCase();
}

async function traducirTexto(texto, destino) {
  if (!texto || !texto.trim()) return texto;

  // Argos/LibreTranslate devuelve salidas basura (ej. "_") con palabras
  // sueltas en MAYÚSCULAS -- en formato normal traduce bien ("Prueba" ->
  // "Test"). Los títulos que usan esto se muestran igual en mayúsculas por
  // CSS (text-transform: uppercase), así que no se pierde nada visualmente
  // al mandar a traducir la versión no-mayúscula.
  const textoParaTraducir = esTodoMayusculas(texto)
    ? texto.charAt(0) + texto.slice(1).toLowerCase()
    : texto;

  const res = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: textoParaTraducir, source: IDIOMA_ORIGEN, target: destino, format: 'text' }),
  });
  if (!res.ok) throw new Error(`LibreTranslate respondió ${res.status}`);
  const data = await res.json();
  const traducido = typeof data.translatedText === 'string' ? data.translatedText : texto;

  // Salvaguarda contra salidas degeneradas del motor: si aun así no queda
  // ninguna letra, mejor mostrar el original sin traducir que basura.
  if (texto.trim().length > 2 && !/[a-zA-Z]/.test(traducido)) {
    return texto;
  }
  return traducido;
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

async function traducirHtml(html, destino) {
  if (!html || !html.trim()) return html;
  const raiz = parse(html);
  const nodosDeTexto = recolectarNodosDeTexto(raiz);
  await Promise.all(
    nodosDeTexto.map(async (nodo) => {
      if (!nodo.rawText || !nodo.rawText.trim()) return;
      nodo.rawText = await traducirTexto(nodo.rawText, destino);
    })
  );
  return raiz.toString();
}

/**
 * Devuelve el post con title/content/pages en `lang`. Traduce y cachea en el
 * primer pedido; las siguientes veces lee directo de post_translations, sin
 * volver a llamar a LibreTranslate.
 *
 * Si LibreTranslate no responde (contenedor caído, primer arranque aún
 * descargando modelos), se registra el error y se devuelve el post ORIGINAL
 * sin traducir -- un problema del traductor no debe tumbar la lista de
 * publicaciones para nadie.
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

    const [tituloTraducido, contenidoTraducido, paginasTraducidas] = await Promise.all([
      traducirTexto(post.title, lang),
      traducirHtml(post.content, lang),
      Promise.all((post.pages || []).map(async (pagina) => ({
        ...pagina,
        content: await traducirHtml(pagina.content, lang),
      }))),
    ]);

    await pool.query(
      `INSERT INTO post_translations (post_id, lang, title, content, pages)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (post_id, lang) DO UPDATE
         SET title = $3, content = $4, pages = $5::jsonb, translated_at = now()`,
      [post.id, lang, tituloTraducido, contenidoTraducido, JSON.stringify(paginasTraducidas)]
    );

    return {
      ...post,
      title: tituloTraducido,
      content: contenidoTraducido,
      pages: paginasTraducidas.length > 0 ? paginasTraducidas : post.pages,
    };
  } catch (err) {
    console.error(`[svc-content] No se pudo traducir el post ${post.id} a "${lang}":`, err.message);
    return post;
  }
}

// Se llama al editar o borrar un post: la traducción cacheada de la versión
// vieja ya no aplica. No hace falta regenerarla aquí -- se rehace sola, de
// forma perezosa, la próxima vez que alguien la pida en ese idioma.
export async function invalidarTraducciones(postId) {
  await pool.query('DELETE FROM post_translations WHERE post_id = $1', [postId]);
}
