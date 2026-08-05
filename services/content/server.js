import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getPool } from '../shared/db.js';
import { verifyToken, IS_PRODUCTION } from '../shared/auth.js';
import { csrfProtection } from '../shared/csrf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

const app = express();
const PORT = process.env.PORT || 3001;
const pool = getPool();

app.use(cors({ origin: IS_PRODUCTION ? (process.env.CORS_ORIGIN || false) : true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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

const upload = multer({ storage, fileFilter });

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
  res.json(rows.map(rowToPost));
});

app.post('/api/upload', verifyToken, csrfProtection, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });
  res.json({ url: `/api/uploads/${req.file.filename}` });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('Formato')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.post('/api/posts', verifyToken, csrfProtection, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('redactor')) {
    return res.status(403).json({ message: 'No tienes permisos para crear publicaciones' });
  }
  const body = req.body ?? {};
  const id = body.id || Date.now().toString();
  const extra = splitExtra(body);

  await pool.query(
    `INSERT INTO posts (id, title, type, content, image, video_url, model_url, category, is_hidden, pages, extra)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)`,
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
  const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
  res.status(201).json(rowToPost(rows[0]));
});

app.put('/api/posts/:id', verifyToken, csrfProtection, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('redactor')) {
    return res.status(403).json({ message: 'No tienes permisos para editar publicaciones' });
  }
  const { rows: existingRows } = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ message: 'Publicación no encontrada' });

  const { id, ...updateData } = req.body ?? {};
  const merged = { ...rowToPost(existing), ...updateData };
  const extra = splitExtra(merged);

  await pool.query(
    `UPDATE posts SET title=$1, type=$2, content=$3, image=$4, video_url=$5, model_url=$6,
       category=$7, is_hidden=$8, pages=$9::jsonb, extra=$10::jsonb WHERE id=$11`,
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
  const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  res.json(rowToPost(rows[0]));
});

app.delete('/api/posts/:id', verifyToken, csrfProtection, async (req, res) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: 'Solo los administradores pueden eliminar' });
  }
  const { rowCount } = await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  if (rowCount > 0) res.json({ success: true });
  else res.status(404).json({ message: 'Publicación no encontrada' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`svc-content escuchando en :${PORT} [${IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO'}]`);
});
