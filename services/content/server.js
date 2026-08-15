import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';
import rateLimit from 'express-rate-limit';
import { getPool } from '../shared/db.js';
import { verifyToken, requirePermiso, permisosDe, sesionOpcional, IS_PRODUCTION } from '../shared/auth.js';
import { csrfProtection } from '../shared/csrf.js';
import { saveLog } from '../shared/logs.js';
import {
  adjuntarTraducciones,
  invalidarTraducciones,
  regenerarTraducciones,
  precalentarTraducciones,
} from './translate.js';

// Es la ruta de mayor costo de I/O de los tres servicios (escribe archivos a
// disco) y era la única de los tres sin ningún límite de frecuencia — ni
// siquiera express-rate-limit estaba en su package.json. Mismo criterio que
// el resto de límites del proyecto: por usuario autenticado, no por IP,
// porque ya pasó por verifyToken.
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.matricula || req.ip,
  handler: (req, res) => res.status(429).json({ message: 'Demasiadas subidas: espera un minuto antes de reintentar.' }),
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
// Una sola vez al arrancar el servicio, no en cada POST /api/upload.
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.set('trust proxy', 1); // Caddy es el único proxy delante
const PORT = process.env.PORT || 3001;
const pool = getPool();

app.use(cors({ origin: IS_PRODUCTION ? (process.env.CORS_ORIGIN || false) : true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|glb|gltf|mp4)$/i;
  if (!file.originalname.match(allowedExtensions)) {
    return cb(new Error('Formato de archivo no permitido. Solo se permiten imágenes, videos y modelos 3D.'));
  }
  cb(null, true);
};

// 25 MB: no había NINGÚN límite, así que una subida podía llenar el disco del
// servidor. Una foto de móvil no pasa de 12 MB y un modelo 3D grande ronda los
// 20; por encima de eso hay que preguntar antes de aceptarlo.
const LIMITE_SUBIDA = 25 * 1024 * 1024;

const upload = multer({ storage, fileFilter, limits: { fileSize: LIMITE_SUBIDA } });

// ---------------------------------------------------------------------------
// Reducción de imágenes
//
// El CMS guardaba el archivo tal cual: hay publicaciones de 1.5 MB, y una foto
// de un móvil actual pasa de 5 MB. Eso lo descarga entero cada visitante, y en
// datos móviles se nota muchísimo.
//
// Lo que se hace con cada imagen subida:
//   - se reduce a ANCHO_MAXIMO si es más grande (sin ampliar nunca: agrandar
//     una imagen pequeña solo suma peso y no añade detalle);
//   - se convierte a WebP, que para una foto pesa la mitad que un JPEG con la
//     misma calidad aparente;
//   - se descartan los metadatos de la cámara (ubicación GPS incluida, que
//     nadie quiere publicar sin darse cuenta).
//
// GIF y SVG quedan fuera: el primero puede ser animado y convertirlo lo
// congela; el segundo ya es vectorial y pesa poco.
// ---------------------------------------------------------------------------
const ANCHO_MAXIMO = 1800;
const CALIDAD_WEBP = 82;
const CONVERTIBLES = /\.(jpe?g|png|webp)$/i;

// Un cartel no es una foto.
//
// La compresión con pérdida está pensada para degradados suaves: en una foto
// nadie nota que se pierda algo. En un gráfico plano con texto grande —un
// cartel, una captura, un diagrama— hace lo contrario: deja un halo sucio
// alrededor de cada letra que se ve como si la imagen estuviera desenfocada.
// Se midió: el mismo recorte del titular pasaba de 12 KB a 53 KB al
// recomprimirlo sin pérdida, y todo ese peso de más era ruido inventado por
// el compresor.
//
// La pista para distinguirlos es el formato de origen. Nadie exporta una foto
// de cámara a PNG; sí exporta a PNG un cartel de Figma o una captura de
// pantalla. Así que los PNG van sin pérdida y las fotos siguen igual que
// hasta ahora.
const SIN_PERDIDA = /\.png$/i;
// Techo de seguridad: si alguien sube una foto guardada como PNG, sin pérdida
// pesaría muchísimo. Por encima de esto se rehace con pérdida.
const TOPE_SIN_PERDIDA = 1.5 * 1024 * 1024;

async function reducirImagen(rutaOriginal, nombreOriginal) {
  const destino = rutaOriginal.replace(/\.[^.]+$/, '') + '.webp';
  const base = () => sharp(rutaOriginal)
    .rotate()                       // respeta la orientación EXIF de la cámara
    .resize({ width: ANCHO_MAXIMO, withoutEnlargement: true });

  const esGrafico = SIN_PERDIDA.test(nombreOriginal || rutaOriginal);

  if (esGrafico) {
    await base().webp({ lossless: true, effort: 5 }).toFile(destino);
    const { size } = await fs.promises.stat(destino);
    if (size > TOPE_SIN_PERDIDA) {
      await base().webp({ quality: CALIDAD_WEBP }).toFile(destino);
    }
  } else {
    await base().webp({ quality: CALIDAD_WEBP }).toFile(destino);
  }

  await fs.promises.unlink(rutaOriginal).catch(() => {});
  return path.basename(destino);
}

const KNOWN_POST_FIELDS = new Set([
  'title', 'type', 'content', 'image', 'videoUrl', 'modelUrl', 'category', 'isHidden', 'pages',
  // No es una columna de `posts` —vive en post_miembros— pero sí un campo
  // conocido: sin declararlo aquí, splitExtra lo tomaría por un campo
  // desconocido y lo guardaría dentro de la columna `extra`.
  'autores',
]);

/**
 * Reescribe quién desarrolló una publicación.
 *
 * Se borra y se vuelve a insertar en lugar de calcular altas y bajas: la
 * lista completa es lo que manda el editor, y con dos o tres personas por
 * publicación el diff no compensa el riesgo de dejar a alguien colgado.
 *
 * Va en una transacción para que no exista un instante en el que la
 * publicación no tenga autores; si algo falla, se queda como estaba.
 */
async function guardarAutores(postId, autores) {
  if (!Array.isArray(autores)) return;   // no venía en el cuerpo: no se toca

  const limpios = autores
    .map((a) => ({
      userId: Number.parseInt(a?.userId, 10),
      papel: typeof a?.papel === 'string' ? a.papel.trim().slice(0, 80) || null : null,
      lider: Boolean(a?.lider),
    }))
    .filter((a) => Number.isInteger(a.userId));

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('DELETE FROM post_miembros WHERE post_id = $1', [postId]);
    for (const a of limpios) {
      await cliente.query(
        `INSERT INTO post_miembros (post_id, user_id, papel, lider) VALUES ($1, $2, $3, $4)
         ON CONFLICT (post_id, user_id) DO UPDATE SET papel = EXCLUDED.papel, lider = EXCLUDED.lider`,
        [postId, a.userId, a.papel, a.lider]
      );
    }
    await cliente.query('COMMIT');
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}

function rowToPost(row, includeContent = true) {
  const post = {
    id: row.id,
    title: row.title,
    type: row.type,
    image: row.image,
    videoUrl: row.video_url,
    modelUrl: row.model_url,
    category: row.category,
    isHidden: row.is_hidden,
    ...(row.extra ?? {}),
  };

  if (includeContent) {
    post.content = row.content;
    post.pages = row.pages;
  } else {
    if (row.type === 'simple' && row.content) {
      const stripped = row.content.replace(/<[^>]*>?/gm, '');
      post.previewText = stripped.substring(0, 140) + (stripped.length > 140 ? '...' : '');
    }
  }

  return post;
}

function splitExtra(body) {
  return Object.fromEntries(Object.entries(body).filter(([k, v]) => !KNOWN_POST_FIELDS.has(k) && v !== undefined));
}

app.get('/api/hello', (req, res) => res.json({ message: 'svc-content ok' }));

// La misma ruta sirve a dos públicos: el visitante de la web y el panel de
// redacción. La diferencia la marca la sesión, no el cliente.
//
// "Oculta" se aplicaba solo en el navegador: el servidor mandaba TODAS las
// publicaciones a cualquiera —con su campo is_hidden incluido— y era
// Landing.tsx quien decidía cuáles pintar. Es decir, un borrador o algo
// retirado a propósito seguía estando a un `curl /api/posts` de distancia.
// El filtro tiene que vivir aquí, donde el cliente no puede saltárselo.
app.get('/api/posts', sesionOpcional, async (req, res) => {
  // A partir de ahora la respuesta depende de la cookie. Sin esto, un
  // intermediario que cacheara podría guardar la respuesta de un admin —con
  // las ocultas dentro— y servírsela después a un visitante cualquiera.
  res.set('Vary', 'Cookie');

  // Con sesión se ven todas, incluidas las ocultas: es lo que el panel
  // necesita para poder listarlas y volver a mostrarlas.
  // Los autores llegan en la misma consulta, no en una por publicación.
  // Solo se enlazan los que tienen perfil público: a quien no ha querido
  // aparecer se le nombra igual, pero sin llevar a una página que no existe.
  const AUTORES = `,
    COALESCE(
      (SELECT json_agg(json_build_object(
                'id', u.id, 'nombre',
                CASE WHEN u.show_alias AND u.alias <> '' THEN u.alias ELSE u.nombre END,
                'papel', pm.papel, 'lider', pm.lider, 'publico', u.perfil_publico)
              ORDER BY u.nombre)
         FROM post_miembros pm JOIN users u ON u.id = pm.user_id
        WHERE pm.post_id = posts.id),
      '[]'::json
    ) AS autores`;

  const { rows } = req.user
    ? await pool.query(`SELECT *${AUTORES} FROM posts ORDER BY date DESC`)
    : await pool.query(`SELECT *${AUTORES} FROM posts WHERE is_hidden IS NOT TRUE ORDER BY date DESC`);
  
  const includeContent = req.query.full === 'true';
  const posts = rows.map((r) => ({ ...rowToPost(r, includeContent), autores: r.autores ?? [] }));

  // 'es' es el idioma nativo del contenido -- nada que traducir. Cualquier
  // otro valor de ?lang= se sirve de post_translations, que ya está lleno
  // desde que se guardó la publicación: aquí solo se lee.
  const lang = req.query.lang;
  if (lang && lang !== 'es') {
    return res.json(await adjuntarTraducciones(posts, lang));
  }

  res.json(posts);
});

app.get('/api/posts/:id', sesionOpcional, async (req, res) => {
  res.set('Vary', 'Cookie');
  const AUTORES = `,
    COALESCE(
      (SELECT json_agg(json_build_object(
                'id', u.id, 'nombre',
                CASE WHEN u.show_alias AND u.alias <> '' THEN u.alias ELSE u.nombre END,
                'papel', pm.papel, 'lider', pm.lider, 'publico', u.perfil_publico)
              ORDER BY u.nombre)
         FROM post_miembros pm JOIN users u ON u.id = pm.user_id
        WHERE pm.post_id = posts.id),
      '[]'::json
    ) AS autores`;

  const query = req.user
    ? `SELECT *${AUTORES} FROM posts WHERE id = $1`
    : `SELECT *${AUTORES} FROM posts WHERE id = $1 AND is_hidden IS NOT TRUE`;
  const { rows } = await pool.query(query, [req.params.id]);

  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
  
  const posts = [{ ...rowToPost(rows[0], true), autores: rows[0].autores ?? [] }];
  
  const lang = req.query.lang;
  if (lang && lang !== 'es') {
    const translated = await adjuntarTraducciones(posts, lang);
    return res.json(translated[0]);
  }

  res.json(posts[0]);
});

app.post('/api/upload', verifyToken, uploadLimiter, csrfProtection, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No se subió ningún archivo.' });

  let nombre = req.file.filename;

  if (CONVERTIBLES.test(nombre)) {
    try {
      nombre = await reducirImagen(req.file.path, req.file.originalname);
    } catch (e) {
      // Si la reducción falla —un archivo corrupto, un formato raro— se
      // conserva el original y se sirve igual. Perder la subida del usuario
      // por no poder optimizarla sería un mal negocio.
      console.error('[upload] no se pudo reducir la imagen:', e.message);
    }
  }

  res.json({ url: `/api/uploads/${nombre}` });
});

app.use((err, req, res, next) => {
  // "File too large" no le dice nada a quien está subiendo una foto: hay que
  // decirle cuánto pesa el límite y qué hacer.
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false, message: `El archivo supera los ${Math.round(LIMITE_SUBIDA / 1024 / 1024)} MB. Reduce su tamaño e inténtalo de nuevo.`,
    });
  }
  if (err instanceof multer.MulterError || err.message?.includes('Formato')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

app.post('/api/posts', verifyToken, requirePermiso('publicaciones.editar'), csrfProtection, async (req, res) => {
  const body = req.body ?? {};
  if (!body.title) {
    return res.status(400).json({ success: false, message: 'title es requerido' });
  }
  const id = body.id || Date.now().toString();
  const extra = splitExtra(body);

  const { rows } = await pool.query(
    `INSERT INTO posts (id, title, type, content, image, video_url, model_url, category, is_hidden, pages, extra)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
     RETURNING *`,
    [
      id,
      body.title,
      body.type ?? 'simple',
      body.content ?? null,
      body.image ?? null,
      body.videoUrl ?? null,
      body.modelUrl ?? null,
      body.category ?? null,
      Boolean(body.isHidden),
      JSON.stringify(body.type === 'magazine' ? body.pages || [] : []),
      JSON.stringify(extra),
    ]
  );
  // Firmar lo puede hacer quien tenga el permiso, no solo el rol admin.
  const permisos = await permisosDe(req.user);
  if (permisos.has('publicaciones.firmar')) await guardarAutores(id, body.autores);

  await saveLog('info', `${req.user.matricula} creó la publicación ${id}.`);

  // Traducirla ahora, no cuando llegue el primer visitante que la pida en
  // inglés. No se espera: corre por detrás mientras el redactor sigue.
  const creada = rowToPost(rows[0]);
  await regenerarTraducciones(creada);

  res.status(201).json(creada);
});

app.put('/api/posts/:id', verifyToken, requirePermiso('publicaciones.editar'), csrfProtection, async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ success: false, message: 'Publicación no encontrada' });

  const { id, ...updateData } = req.body ?? {};
  const merged = { ...rowToPost(existing), ...updateData };
  const extra = splitExtra(merged);

  const { rows } = await pool.query(
    `UPDATE posts SET title=$1, type=$2, content=$3, image=$4, video_url=$5, model_url=$6,
       category=$7, is_hidden=$8, pages=$9::jsonb, extra=$10::jsonb WHERE id=$11
     RETURNING *`,
    [
      merged.title,
      merged.type,
      merged.content,
      merged.image,
      merged.videoUrl,
      merged.modelUrl,
      merged.category,
      Boolean(merged.isHidden),
      JSON.stringify(merged.pages ?? []),
      JSON.stringify(extra),
      req.params.id,
    ]
  );
  const permisosUpdate = await permisosDe(req.user);
  if (permisosUpdate.has('publicaciones.firmar')) await guardarAutores(req.params.id, updateData.autores);

  await saveLog('info', `${req.user.matricula} modificó la publicación ${req.params.id}.`);

  // La traducción vieja ya no corresponde al texto nuevo: se tira y se
  // rehace aquí mismo, para que el visitante no se encuentre la publicación
  // en español al pedirla en inglés.
  const modificada = rowToPost(rows[0]);
  await regenerarTraducciones(modificada);

  res.json(modificada);
});

app.delete('/api/posts/:id', verifyToken, requirePermiso('publicaciones.borrar'), csrfProtection, async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
  await invalidarTraducciones(req.params.id);
  await saveLog('warning', `${req.user.matricula} eliminó la publicación ${req.params.id}.`);
  res.json({ success: true });
});

// Ver la nota equivalente en services/identity/server.js: sin este catch-all
// al final, un fallo de base en /api/posts (POST/PUT/DELETE) caía en el
// handler HTML por defecto de Express -- el frontend hace res.json() y
// revienta con un error de parseo en vez de mostrar el mensaje real. El
// middleware de arriba, específico de Multer, sigue intercambiando primero
// los errores de subida de archivos y reenvía el resto aquí vía next(err).
app.use((err, req, res, _next) => {
  console.error('[svc-content]', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`svc-content escuchando en :${PORT} [${IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO'}]`);

  // Fuera del camino de arranque: si falta alguna traducción se genera por
  // detrás, sin retrasar la puesta en marcha ni tumbar el servicio si
  // LibreTranslate todavía no está listo.
  precalentarTraducciones().catch((err) => {
    console.error('[svc-content] No se pudo revisar las traducciones pendientes:', err.message);
  });
});
