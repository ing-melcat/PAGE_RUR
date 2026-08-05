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

app.get('/api/me', verifyToken, noStore, (req, res) => {
  res.json({ success: true, user: req.user });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`svc-identity escuchando en :${PORT} [${IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO'}]`);
});
