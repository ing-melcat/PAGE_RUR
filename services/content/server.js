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
import { verifyToken, requireRole, IS_PRODUCTION } from '../shared/auth.js';
import { csrfProtection } from '../shared/csrf.js';
import { saveLog } from '../shared/logs.js';
import { traducirPost, invalidarTraducciones } from './translate.js';

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

async function reducirImagen(rutaOriginal, nombreOriginal) {
  const destino = rutaOriginal.replace(/\.[^.]+$/, '') + '.webp';

  await sharp(rutaOriginal)
    .rotate()                       // respeta la orientación EXIF de la cámara
    .resize({ width: ANCHO_MAXIMO, withoutEnlargement: true })
    .webp({ quality: CALIDAD_WEBP })
    .toFile(destino);

  await fs.promises.unlink(rutaOriginal).catch(() => {});
  return path.basename(destino);
}

const KNOWN_POST_FIELDS = new Set([
  'title', 'type', 'content', 'image', 'videoUrl', 'modelUrl', 'category', 'isHidden', 'pages',
]);

function rowToPost(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    content: row.content,
    image: row.image,
    videoUrl: row.video_url,
    modelUrl: row.model_url,
    category: row.category,
    isHidden: row.is_hidden,
    pages: row.pages,
    ...(row.extra ?? {}),
  };
}

function splitExtra(body) {
  return Object.fromEntries(Object.entries(body).filter(([k, v]) => !KNOWN_POST_FIELDS.has(k) && v !== undefined));
}

app.get('/api/hello', (req, res) => res.json({ message: 'svc-content ok' }));

app.get('/api/posts', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM posts ORDER BY date DESC');
  const posts = rows.map(rowToPost);

  // 'es' es el idioma nativo del contenido -- nada que traducir. Cualquier
  // otro valor de ?lang= pasa por la caché de post_translations.
  const lang = req.query.lang;
  if (lang && lang !== 'es') {
    const traducidos = await Promise.all(posts.map((post) => traducirPost(post, lang)));
    return res.json(traducidos);
  }

  res.json(posts);
});

app.post('/api/upload', verifyToken, uploadLimiter, csrfProtection, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

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
      error: `El archivo supera los ${Math.round(LIMITE_SUBIDA / 1024 / 1024)} MB. Reduce su tamaño e inténtalo de nuevo.`,
    });
  }
  if (err instanceof multer.MulterError || err.message?.includes('Formato')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.post('/api/posts', verifyToken, requireRole('admin', 'redactor'), csrfProtection, async (req, res) => {
  const body = req.body ?? {};
  if (!body.title) {
    return res.status(400).json({ message: 'title es requerido' });
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
  await saveLog('info', `${req.user.matricula} creó la publicación ${id}.`);
  res.status(201).json(rowToPost(rows[0]));
});

app.put('/api/posts/:id', verifyToken, requireRole('admin', 'redactor'), csrfProtection, async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ message: 'Publicación no encontrada' });

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
  await invalidarTraducciones(req.params.id);
  await saveLog('info', `${req.user.matricula} modificó la publicación ${req.params.id}.`);
  res.json(rowToPost(rows[0]));
});

app.delete('/api/posts/:id', verifyToken, requireRole('admin'), csrfProtection, async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ message: 'Publicación no encontrada' });
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
});
