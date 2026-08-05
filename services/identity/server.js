import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { getPool } from '../shared/db.js';
import {
  SESSION_COOKIE,
  CSRF_COOKIE,
  verifyToken,
  signSessionToken,
  baseCookieOptions,
  noStore,
  IS_PRODUCTION,
} from '../shared/auth.js';
import { generateCsrfToken, csrfProtection } from '../shared/csrf.js';
import { loginIpLimiter, isLocked, lockedRemainingMs, recordFailure, recordSuccess } from '../shared/loginProtection.js';

const app = express();
const PORT = process.env.PORT || 3001;
const pool = getPool();

app.use(cors({ origin: IS_PRODUCTION ? (process.env.CORS_ORIGIN || false) : true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
// csrfProtection se aplica por ruta, no global: /api/login no tiene sesión
// previa que proteger (nada que un CSRF pueda "montar" todavía).

async function saveLog(type, message) {
  await pool.query('INSERT INTO logs (type, message) VALUES ($1, $2)', [type, message]);
}

// Forma canónica del usuario que se le devuelve al frontend. Nunca incluye
// password_hash. Es la única función que construye este objeto, para que
// /api/login y /api/me no puedan divergir en qué campos traen.
function publicUser(row) {
  return {
    id: row.matricula,
    matricula: row.matricula,
    nombre: row.nombre,
    roles: row.roles ?? [],
    grupo: row.grupo,
    alias: row.alias ?? '',
    bio: row.bio ?? '',
    foto: row.foto ?? '',
    github: row.github ?? '',
    instagram: row.instagram ?? '',
    reddit: row.reddit ?? '',
    facebook: row.facebook ?? '',
    show_alias: row.show_alias ?? false,
    push_notifications: row.push_notifications ?? false,
    control_mappings: row.control_mappings ?? {},
  };
}

// Campos que un usuario puede editar de su PROPIA cuenta. Deliberadamente no
// incluye roles, matricula ni grupo: eso solo lo cambia un admin vía
// /api/users/:matricula. Sin esta lista blanca, un PUT /api/me con
// {"roles":["admin"]} sería una escalada de privilegios directa.
const EDITABLE_PROFILE_FIELDS = {
  alias: { column: 'alias', kind: 'text', maxLength: 100 },
  bio: { column: 'bio', kind: 'text', maxLength: 2000 },
  foto: { column: 'foto', kind: 'upload', maxLength: 255 },
  github: { column: 'github', kind: 'link', maxLength: 255 },
  instagram: { column: 'instagram', kind: 'link', maxLength: 255 },
  reddit: { column: 'reddit', kind: 'link', maxLength: 255 },
  facebook: { column: 'facebook', kind: 'link', maxLength: 255 },
  show_alias: { column: 'show_alias', kind: 'boolean' },
  push_notifications: { column: 'push_notifications', kind: 'boolean' },
};

// Los mapeos de control son JSON libre (el frontend decide su forma), así que
// el límite es de tamaño: sin tope, un usuario podría empujar megabytes a su
// fila y hacérselos leer al servicio en cada login.
const MAX_MAPPINGS_CHARS = 8192;

// Un enlace de perfil acaba renderizado en un href/img del panel. Aceptar
// texto libre aquí sería un XSS almacenado vía "javascript:...".
function sanitizeLink(raw) {
  const value = String(raw).trim();
  if (value === '') return { ok: true, value: '' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      return { ok: false, error: 'El enlace no es una URL válida.' };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: 'Solo se permiten enlaces http:// o https://' };
    }
    return { ok: true, value };
  }
  // Sin esquema explícito: es un handle tipo "u/usuario". El regex de arriba
  // ya descartó cualquier pseudo-esquema, así que no puede colarse uno.
  return { ok: true, value };
}

// La foto tiene que ser un archivo que subimos nosotros (svc-content la
// escribe en /api/uploads/). Aceptar una URL arbitraria convertiría el avatar
// en un pixel de rastreo hacia un host de terceros.
function sanitizeUploadPath(raw) {
  const value = String(raw).trim();
  if (value === '') return { ok: true, value: '' };
  if (!value.startsWith('/api/uploads/') || value.includes('..')) {
    return { ok: false, error: 'La foto debe ser un archivo subido a /api/uploads/.' };
  }
  return { ok: true, value };
}

function sanitizeProfileField(spec, raw) {
  if (spec.kind === 'boolean') {
    if (typeof raw !== 'boolean') return { ok: false, error: 'Se esperaba un valor booleano.' };
    return { ok: true, value: raw };
  }
  if (typeof raw !== 'string') return { ok: false, error: 'Se esperaba texto.' };

  const checked =
    spec.kind === 'link' ? sanitizeLink(raw)
    : spec.kind === 'upload' ? sanitizeUploadPath(raw)
    : { ok: true, value: raw.trim() };

  if (!checked.ok) return checked;
  if (checked.value.length > spec.maxLength) {
    // El schema declara VARCHAR(n); sin este corte Postgres tiraría un 500
    // en vez de un 400 explicando qué campo se pasó.
    return { ok: false, error: `El valor supera el máximo de ${spec.maxLength} caracteres.` };
  }
  return checked;
}

app.get('/api/hello', (req, res) => {
  res.json({ message: 'svc-identity ok' });
});

app.post('/api/login', loginIpLimiter, async (req, res) => {
  const { matricula, password } = req.body ?? {};
  if (!matricula || !password) {
    return res.status(400).json({ success: false, message: 'Matrícula y contraseña son requeridas' });
  }

  if (isLocked(matricula)) {
    const waitSec = Math.ceil(lockedRemainingMs(matricula) / 1000);
    return res.status(429).json({ success: false, message: `Demasiados intentos fallidos. Espera ${waitSec}s.` });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE matricula = $1', [matricula]);
  const userRecord = rows[0];
  const isMatch = userRecord ? bcrypt.compareSync(password, userRecord.password_hash) : false;

  if (userRecord && isMatch) {
    recordSuccess(matricula);
    const user = publicUser(userRecord);
    // El token solo lleva identidad y autorización. Los datos de perfil
    // (alias, foto, mapeos...) se leen de la base en /api/me: si vivieran en
    // el JWT, editarlos no surtiría efecto hasta el siguiente login.
    const token = signSessionToken({
      id: user.id,
      matricula: user.matricula,
      nombre: user.nombre,
      roles: user.roles,
      grupo: user.grupo,
    });
    const csrfToken = generateCsrfToken();

    res.cookie(SESSION_COOKIE, token, { ...baseCookieOptions(), httpOnly: true });
    res.cookie(CSRF_COOKIE, csrfToken, { ...baseCookieOptions(), httpOnly: false });

    await saveLog('success', `Usuario ${user.nombre} (${matricula}) inició sesión exitosamente.`);
    return res.json({ success: true, user });
  }

  recordFailure(matricula);
  if (userRecord) {
    await saveLog('error', `Intento de acceso fallido para ${matricula} (Contraseña incorrecta).`);
  } else {
    await saveLog('warning', `Intento de acceso fallido para usuario inexistente: ${matricula}`);
  }
  res.status(401).json({ success: false, message: 'Matrícula o código incorrecto' });
});

app.post('/api/logout', csrfProtection, (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
  res.json({ success: true });
});

// Lee el perfil de la base, no del JWT. Antes devolvía `req.user` tal cual, o
// sea una foto congelada en el momento del login: cualquier cambio de perfil
// (o de roles hecho por un admin) quedaba invisible hasta cerrar sesión.
app.get('/api/me', verifyToken, noStore, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE matricula = $1', [req.user.matricula]);
  if (!rows[0]) {
    // La cuenta se borró pero su cookie sigue viva: se corta aquí.
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.clearCookie(CSRF_COOKIE, { path: '/' });
    return res.status(401).json({ success: false, message: 'La cuenta ya no existe' });
  }
  res.json({ success: true, user: publicUser(rows[0]) });
});

// Personalización de perfil. Actúa siempre sobre req.user.matricula (la
// identidad del token), nunca sobre una matrícula del body: si el usuario
// eligiera el destino, podría editar el perfil de cualquier otro.
app.put('/api/me', verifyToken, csrfProtection, noStore, async (req, res) => {
  const body = req.body ?? {};
  const assignments = [];
  const values = [];

  for (const [field, spec] of Object.entries(EDITABLE_PROFILE_FIELDS)) {
    if (body[field] === undefined) continue;
    const checked = sanitizeProfileField(spec, body[field]);
    if (!checked.ok) {
      return res.status(400).json({ success: false, message: `${field}: ${checked.error}` });
    }
    values.push(checked.value);
    // spec.column sale de EDITABLE_PROFILE_FIELDS, una constante del código;
    // nunca de la petición. Los valores sí van parametrizados.
    assignments.push(`${spec.column} = $${values.length}`);
  }

  if (assignments.length === 0) {
    return res.status(400).json({ success: false, message: 'No se envió ningún campo editable' });
  }

  values.push(req.user.matricula);
  const { rows } = await pool.query(
    `UPDATE users SET ${assignments.join(', ')} WHERE matricula = $${values.length} RETURNING *`,
    values
  );
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

  res.json({ success: true, user: publicUser(rows[0]), message: 'Perfil actualizado' });
});

app.put('/api/me/mappings', verifyToken, csrfProtection, noStore, async (req, res) => {
  const mappings = req.body?.control_mappings;
  if (typeof mappings !== 'object' || mappings === null || Array.isArray(mappings)) {
    return res.status(400).json({ success: false, message: 'control_mappings debe ser un objeto' });
  }

  const serialized = JSON.stringify(mappings);
  if (serialized.length > MAX_MAPPINGS_CHARS) {
    return res.status(413).json({ success: false, message: 'La configuración de controles es demasiado grande' });
  }

  const { rows } = await pool.query(
    'UPDATE users SET control_mappings = $1::jsonb WHERE matricula = $2 RETURNING *',
    [serialized, req.user.matricula]
  );
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

  res.json({ success: true, user: publicUser(rows[0]), message: 'Controles guardados' });
});

app.get('/api/users', verifyToken, noStore, async (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  const { rows } = await pool.query(
    'SELECT matricula, nombre, grupo, roles, alias FROM users ORDER BY matricula'
  );
  res.json(rows);
});

app.post('/api/users', verifyToken, csrfProtection, async (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  const { matricula, password, nombre, roles, grupo, alias } = req.body ?? {};
  if (!matricula || !password || !nombre) {
    return res.status(400).json({ message: 'matricula, password y nombre son requeridos' });
  }

  const { rows: existing } = await pool.query('SELECT 1 FROM users WHERE matricula = $1', [matricula]);
  if (existing.length > 0) {
    return res.status(400).json({ message: 'La matrícula ya existe' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  await pool.query(
    `INSERT INTO users (matricula, password_hash, nombre, roles, grupo, alias)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
    [matricula, passwordHash, nombre, JSON.stringify(roles || []), grupo || 'GENERAL', alias || '']
  );
  await saveLog('info', `Administrador ${req.user.matricula} creó el usuario ${matricula}.`);
  res.json({ success: true, message: 'Usuario creado' });
});

app.put('/api/users/:matricula', verifyToken, csrfProtection, async (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  const { matricula } = req.params;
  const { rows } = await pool.query('SELECT * FROM users WHERE matricula = $1', [matricula]);
  const existingUser = rows[0];
  if (!existingUser) return res.status(404).json({ message: 'Usuario no encontrado' });

  const nombre = req.body.nombre ?? existingUser.nombre;
  const roles = req.body.roles ?? existingUser.roles;
  const grupo = req.body.grupo ?? existingUser.grupo;
  const alias = req.body.alias !== undefined ? req.body.alias : existingUser.alias;
  const passwordHash =
    req.body.password && req.body.password.trim() !== ''
      ? bcrypt.hashSync(req.body.password, 10)
      : existingUser.password_hash;

  await pool.query(
    `UPDATE users SET nombre = $1, roles = $2::jsonb, grupo = $3, alias = $4, password_hash = $5
     WHERE matricula = $6`,
    [nombre, JSON.stringify(roles), grupo, alias, passwordHash, matricula]
  );
  await saveLog('info', `Administrador ${req.user.matricula} modificó el usuario ${matricula}.`);
  res.json({ success: true, message: 'Usuario actualizado correctamente' });
});

app.delete('/api/users/:matricula', verifyToken, csrfProtection, async (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  const { matricula } = req.params;
  if (matricula === req.user.matricula) {
    return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
  }
  await pool.query('DELETE FROM users WHERE matricula = $1', [matricula]);
  await saveLog('warning', `Administrador ${req.user.matricula} eliminó el usuario ${matricula}.`);
  res.json({ success: true, message: 'Usuario eliminado' });
});

// Sin esto, un fallo de base en una ruta async cae en el handler por defecto
// de Express, que responde HTML: el frontend hace res.json() y revienta con
// un error de parseo en vez de mostrar el mensaje real.
app.use((err, req, res, _next) => {
  console.error('[svc-identity]', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`svc-identity escuchando en :${PORT} [${IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO'}]`);
});
