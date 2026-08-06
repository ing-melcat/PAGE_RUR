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
    const user = {
      id: userRecord.matricula,
      matricula: userRecord.matricula,
      nombre: userRecord.nombre,
      roles: userRecord.roles ?? [],
      grupo: userRecord.grupo,
      alias: userRecord.alias,
      control_mappings: userRecord.control_mappings ?? {},
    };
    const token = signSessionToken(user);
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

function toPublicUser(row) {
  return {
    id: row.matricula,
    matricula: row.matricula,
    nombre: row.nombre,
    roles: row.roles ?? [],
    grupo: row.grupo,
    telefono: row.telefono,
    alias: row.alias,
    bio: row.bio,
    foto: row.foto,
    github: row.github,
    instagram: row.instagram,
    reddit: row.reddit,
    facebook: row.facebook,
    show_alias: row.show_alias,
    push_notifications: row.push_notifications,
    control_mappings: row.control_mappings ?? {},
  };
}

// Recarga desde la BD en vez de confiar en el payload del JWT (que solo se
// firma de nuevo en el próximo login) -- así un cambio de perfil se refleja
// de inmediato aunque la sesión de 24h siga viva con el JWT viejo.
app.get('/api/me', verifyToken, noStore, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE matricula = $1', [req.user.matricula]);
  const row = rows[0];
  if (!row) {
    // La cuenta se borró pero su cookie sigue viva. Un 404 dejaría la sesión
    // colgando; se cierra aquí para que el navegador no siga mandándola.
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.clearCookie(CSRF_COOKIE, { path: '/' });
    return res.status(401).json({ success: false, message: 'La cuenta ya no existe' });
  }
  res.json({ success: true, user: toPublicUser(row) });
});

// Cada campo declara cómo validarse. La lista blanca por sí sola evita la
// escalada de privilegios (un PUT con {"roles":["admin"]} se ignora), pero no
// dice nada del CONTENIDO: sin las reglas de abajo, el valor entra crudo a la
// base y de ahí al panel.
const PROFILE_FIELDS = {
  alias: { kind: 'text', maxLength: 100 },
  bio: { kind: 'text', maxLength: 2000 },
  foto: { kind: 'upload', maxLength: 255 },
  github: { kind: 'link', maxLength: 255 },
  instagram: { kind: 'link', maxLength: 255 },
  reddit: { kind: 'link', maxLength: 255 },
  facebook: { kind: 'link', maxLength: 255 },
  show_alias: { kind: 'boolean' },
  push_notifications: { kind: 'boolean' },
};

// Los mapeos son JSON libre (su forma la decide el frontend), así que el
// límite es de tamaño: sin tope, un usuario puede empujar megabytes a su fila
// y hacérselos leer al servicio en cada carga de perfil.
const MAX_MAPPINGS_CHARS = 8192;

// Un enlace de perfil acaba renderizado en un href del panel. Guardarlo tal
// cual sería un XSS almacenado vía "javascript:...".
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
  // Sin esquema explícito es un handle tipo "u/usuario". El regex de arriba ya
  // descartó cualquier pseudo-esquema, así que no puede colarse uno.
  return { ok: true, value };
}

// La foto tiene que ser un archivo que subimos nosotros (svc-content escribe
// en /api/uploads/). Aceptar una URL arbitraria convertiría el avatar en un
// pixel de rastreo hacia un host de terceros.
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
    // Sin este chequeo, un show_alias:"banana" llega a Postgres y sale como
    // un 500 en vez de un 400 que explique qué campo viene mal.
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
    return { ok: false, error: `El valor supera el máximo de ${spec.maxLength} caracteres.` };
  }
  return checked;
}

// Auto-servicio: el usuario logueado edita su propio perfil (distinto de
// PUT /api/users/:matricula, que es solo para el admin gestionando a otros).
app.put('/api/profile', verifyToken, csrfProtection, noStore, async (req, res) => {
  const setClauses = [];
  const values = [];

  for (const [field, spec] of Object.entries(PROFILE_FIELDS)) {
    if (req.body?.[field] === undefined) continue;
    const checked = sanitizeProfileField(spec, req.body[field]);
    if (!checked.ok) {
      return res.status(400).json({ success: false, message: `${field}: ${checked.error}` });
    }
    values.push(checked.value);
    // El nombre de columna sale de PROFILE_FIELDS, una constante del código;
    // nunca de la petición. Los valores sí van parametrizados.
    setClauses.push(`${field} = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ success: false, message: 'Nada que actualizar' });
  }
  values.push(req.user.matricula);

  const { rows } = await pool.query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE matricula = $${values.length} RETURNING *`,
    values
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  res.json({ success: true, user: toPublicUser(row) });
});

app.put('/api/profile/mappings', verifyToken, csrfProtection, noStore, async (req, res) => {
  const { control_mappings } = req.body ?? {};
  // Tiene que ser un objeto: un string o un número se guardarían igual como
  // jsonb válido, y luego el frontend leería user.control_mappings.adelante
  // como undefined sin que nada hubiera fallado visiblemente.
  if (typeof control_mappings !== 'object' || control_mappings === null || Array.isArray(control_mappings)) {
    return res.status(400).json({ success: false, message: 'control_mappings debe ser un objeto' });
  }

  const serialized = JSON.stringify(control_mappings);
  if (serialized.length > MAX_MAPPINGS_CHARS) {
    return res.status(413).json({ success: false, message: 'La configuración de controles es demasiado grande' });
  }

  const { rows } = await pool.query(
    'UPDATE users SET control_mappings = $1::jsonb WHERE matricula = $2 RETURNING *',
    [serialized, req.user.matricula]
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  res.json({ success: true, user: toPublicUser(row) });
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
// de Express, que responde HTML: el frontend hace res.json() y revienta con un
// error de parseo en vez de mostrar el mensaje real.
app.use((err, req, res, _next) => {
  console.error('[svc-identity]', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`svc-identity escuchando en :${PORT} [${IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO'}]`);
});
