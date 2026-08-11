import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { getPool } from '../shared/db.js';
import {
  SESSION_COOKIE,
  CSRF_COOKIE,
  verifyToken,
  requireRole,
  requirePermiso,
  permisosDe,
  rolesDefinidos,
  invalidarCacheRoles,
  signSessionToken,
  baseCookieOptions,
  noStore,
  IS_PRODUCTION,
} from '../shared/auth.js';
import { generateCsrfToken, csrfProtection } from '../shared/csrf.js';
import { PERMISOS, ES_PERMISO, ROL_TOTAL, permisosEfectivos } from '../shared/permisos.js';
import { MEDALLAS, medallasDe } from '../shared/medallas.js';
import { loginIpLimiter, isLocked, lockedRemainingMs, recordFailure, recordSuccess } from '../shared/loginProtection.js';
import { saveLog } from '../shared/logs.js';

const app = express();
const PORT = process.env.PORT || 3001;
const pool = getPool();

// Hash "de relleno" para comparar contra él cuando la matrícula no existe:
// sin esto, un intento contra una cuenta inexistente respondía casi
// instantáneo (se saltaba bcrypt.compare por completo) mientras uno contra
// una cuenta real tardaba lo que tarda bcrypt -- una diferencia de tiempo
// que deja enumerar matrículas válidas sin necesidad del log de auditoría.
// Calculado una sola vez al arrancar el proceso, no en cada request.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('sin-cuenta-que-comparar', 10);

app.use(cors({ origin: IS_PRODUCTION ? (process.env.CORS_ORIGIN || false) : true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
// csrfProtection se aplica por ruta, no global: /api/login no tiene sesión
// previa que proteger (nada que un CSRF pueda "montar" todavía).

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
  // bcrypt.compare (async) en vez de compareSync: la variante síncrona
  // bloquea el event loop entero de svc-identity mientras corre, así que
  // cualquier otra request concurrente (incluido /api/me) se congelaba con
  // ella. Se compara siempre contra un hash real o el de relleno -- nunca
  // se salta la comparación -- para no filtrar por tiempo de respuesta si
  // la matrícula existe o no.
  const passwordMatch = await bcrypt.compare(password, userRecord ? userRecord.password_hash : DUMMY_PASSWORD_HASH);
  const isMatch = Boolean(userRecord) && passwordMatch;

  if (userRecord && isMatch) {
    recordSuccess(matricula);
    // Misma forma exacta que /api/me. Antes /api/login armaba su propio objeto
    // recortado (sin bio, foto, redes ni preferencias) y eso perdía datos: al
    // entrar a "Personalizar Perfil" sin recargar, el formulario se rellenaba
    // con esos campos en blanco y el primer guardado los sobrescribía vacíos.
    const user = toPublicUser(userRecord);
    // El token solo lleva identidad y autorización. Los datos de perfil se
    // leen de la base en /api/me: si viajaran en el JWT, editarlos no surtiría
    // efecto hasta el siguiente login, y engordarían la cookie sin motivo.
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

// Las columnas de texto son nullables, pero hacia afuera nunca se emite null:
// un campo vacío se representa siempre como "". Sin esto la API rechazaba su
// propia salida — un cliente que reenviara el usuario tal cual lo recibió (que
// es justo lo que hace el editor de perfil) mandaba reddit:null y se llevaba un
// 400 "Se esperaba texto". El contrato tiene que poder ir y volver.
function toPublicUser(row) {
  return {
    id: row.matricula,
    matricula: row.matricula,
    nombre: row.nombre,
    roles: row.roles ?? [],
    grupo: row.grupo ?? '',
    telefono: row.telefono ?? '',
    alias: row.alias ?? '',
    bio: row.bio ?? '',
    foto: row.foto ?? '',
    github: row.github ?? '',
    linkedin: row.linkedin ?? '',
    instagram: row.instagram ?? '',
    reddit: row.reddit ?? '',
    facebook: row.facebook ?? '',
    perfil_publico: row.perfil_publico ?? false,
    rol_publico: row.rol_publico ?? '',
    area: row.area ?? '',
    generacion: row.generacion ?? '',
    show_alias: row.show_alias ?? false,
    push_notifications: row.push_notifications ?? false,
    large_text: row.large_text ?? false,
    reduce_animations: row.reduce_animations ?? false,
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
  // Los permisos van resueltos: el panel no tiene que saber qué implica cada
  // rol, ni volver a calcularlo por su cuenta y arriesgarse a discrepar del
  // servidor.
  const permisos = await permisosDe({ matricula: row.matricula, roles: row.roles ?? [] });
  res.json({ success: true, user: { ...toPublicUser(row), permisos: [...permisos] } });
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
  linkedin: { kind: 'link', maxLength: 255 },
  instagram: { kind: 'link', maxLength: 255 },
  reddit: { kind: 'link', maxLength: 255 },
  facebook: { kind: 'link', maxLength: 255 },
  // Perfil público. Cada quien decide si sale en la web y con qué palabras;
  // nadie más lo edita por él, igual que el resto de este bloque.
  perfil_publico: { kind: 'boolean' },
  rol_publico: { kind: 'text', maxLength: 80 },
  area: { kind: 'text', maxLength: 80 },
  generacion: { kind: 'text', maxLength: 20 },
  show_alias: { kind: 'boolean' },
  push_notifications: { kind: 'boolean' },
  large_text: { kind: 'boolean' },
  reduce_animations: { kind: 'boolean' },
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

// La sección de miembros de la web pública.
//
// Es el único sitio del proyecto donde salen personas reales a internet, así
// que se sujeta a tres reglas:
//
//   1. Solo quien lo ha pedido. `perfil_publico` está en false por defecto:
//      tener cuenta no publica a nadie.
//   2. Lista blanca de columnas, nunca SELECT *. Un campo nuevo en `users`
//      no se filtra solo por existir — para publicarse hay que añadirlo aquí
//      a mano. Fuera quedan matrícula, teléfono, grupo y el hash.
//   3. `roles` NO sale. Mezcla permisos del sistema con áreas escritas a
//      mano, y publicar quién es administrador es dar información de
//      seguridad gratis. Lo que se enseña es `rol_publico`, que lo escribe
//      su dueño.
//
// De paso trae los proyectos de cada uno, que es lo que hace de esto un
// historial de trabajo y no un listado de gente. Solo publicaciones
// visibles: una firmada en algo aún oculto no lo destapa.
const SELECT_MIEMBRO = `
  SELECT u.id, u.nombre, u.alias, u.show_alias, u.bio, u.foto,
         u.rol_publico, u.area, u.generacion,
         u.github, u.linkedin, u.instagram, u.facebook, u.reddit,
         COALESCE(
           (SELECT json_agg(json_build_object('id', p.id, 'titulo', p.title,
                                              'papel', pm.papel, 'lider', pm.lider)
                            ORDER BY p.date DESC)
              FROM post_miembros pm
              JOIN posts p ON p.id = pm.post_id
             WHERE pm.user_id = u.id AND p.is_hidden IS NOT TRUE),
           '[]'::json
         ) AS proyectos,
         COALESCE(
           (SELECT json_agg(json_build_object('clave', m.clave, 'motivo', m.motivo,
                                              'otorgada_por', m.otorgada_por, 'fecha', m.fecha))
              FROM medallas_otorgadas m WHERE m.user_id = u.id),
           '[]'::json
         ) AS otorgadas
    FROM users u
`;

// El nombre que se muestra lo decide quien lo lleva: si activó el alias,
// manda el alias.
//
// Como identificador va el id interno, NO la matrícula: la matrícula es el
// usuario con el que se inicia sesión, así que publicarla sería regalar la
// mitad de las credenciales de cada miembro.
function aMiembroPublico(r) {
  return {
    id: r.id,
    nombre: r.show_alias && r.alias ? r.alias : r.nombre,
    rol: r.rol_publico ?? '',
    area: r.area ?? '',
    generacion: r.generacion ?? '',
    bio: r.bio ?? '',
    foto: r.foto ?? '',
    // Solo las redes que cada quien haya puesto en su perfil: son el único
    // canal de contacto público, en lugar del teléfono o el correo.
    redes: {
      github: r.github ?? '',
      linkedin: r.linkedin ?? '',
      instagram: r.instagram ?? '',
      facebook: r.facebook ?? '',
      reddit: r.reddit ?? '',
    },
    proyectos: r.proyectos ?? [],
    // Se calculan aquí y no en el navegador: si el frontend las dedujera por
    // su cuenta, dos pantallas podrían discrepar sobre quién tiene qué.
    medallas: medallasDe(r.proyectos ?? [], r.otorgadas ?? []),
  };
}

app.get('/api/miembros', async (req, res) => {
  const { rows } = await pool.query(
    `${SELECT_MIEMBRO} WHERE u.perfil_publico IS TRUE ORDER BY u.area NULLS LAST, u.nombre`
  );
  res.json(rows.map(aMiembroPublico));
});

// El perfil de una sola persona, con su historial completo.
//
// Mismo filtro que la lista: si alguien apaga su perfil, su página deja de
// existir aunque tuvieran el enlace guardado. Y el id se fuerza a entero
// para que un ':id' cualquiera no llegue a la consulta.
app.get('/api/miembros/:id', async (req, res) => {
  // Solo dígitos. parseInt es demasiado indulgente —"1abc" y "1;DROP" le
  // valen como 1—, y aunque la consulta va parametrizada y no hay inyección
  // posible, eso haría que media docena de URLs distintas sirvieran el mismo
  // perfil.
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
  }
  const id = Number.parseInt(req.params.id, 10);

  const { rows } = await pool.query(
    `${SELECT_MIEMBRO} WHERE u.perfil_publico IS TRUE AND u.id = $1`,
    [id]
  );
  if (!rows[0]) {
    return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
  }
  res.json(aMiembroPublico(rows[0]));
});

// ---------------------------------------------------------------------------
// Roles
//
// Se administran desde el panel de personal, que es donde ya se asignan. El
// catálogo de permisos, en cambio, es fijo: viene de shared/permisos.js,
// porque cada permiso corresponde a una comprobación real y uno inventado no
// abriría ninguna puerta.
// ---------------------------------------------------------------------------

app.get('/api/roles', verifyToken, noStore, async (req, res) => {
  // Cualquier sesión puede leerlos: el panel necesita los colores y los
  // nombres para pintar a las personas, y saber que existe un rol no da
  // acceso a nada. Crearlos y editarlos sí exige permiso.
  res.json({ roles: await rolesDefinidos(), catalogo: PERMISOS });
});

function permisosLimpios(lista) {
  return Array.isArray(lista) ? [...new Set(lista.filter(ES_PERMISO))] : [];
}

const COLOR_VALIDO = /^#[0-9a-fA-F]{6}$/;

app.post('/api/roles', verifyToken, requirePermiso('roles.gestionar'), csrfProtection, async (req, res) => {
  const nombre = String(req.body?.nombre ?? '').trim().toLowerCase();
  // Sin espacios ni mayúsculas: el nombre viaja dentro de users.roles y se
  // compara en veinte sitios. "Software & Mechanical" como rol ya demostró
  // adónde lleva permitir texto libre aquí.
  if (!/^[a-z0-9_-]{2,40}$/.test(nombre)) {
    return res.status(400).json({ success: false, message: 'Nombre inválido: solo letras, números, guion y guion bajo.' });
  }
  const color = COLOR_VALIDO.test(req.body?.color) ? req.body.color : '#8c9bb0';

  try {
    const { rows } = await pool.query(
      'INSERT INTO roles (nombre, color, permisos) VALUES ($1, $2, $3::jsonb) RETURNING *',
      [nombre, color, JSON.stringify(permisosLimpios(req.body?.permisos))]
    );
    invalidarCacheRoles();
    await saveLog('info', `${req.user.matricula} creó el rol ${nombre}.`);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, message: 'Ese rol ya existe' });
    throw e;
  }
});

app.put('/api/roles/:nombre', verifyToken, requirePermiso('roles.gestionar'), csrfProtection, async (req, res) => {
  const nombre = req.params.nombre;

  // admin no se toca. Es la red de seguridad: si alguien le quitara permisos,
  // nadie podría volver a entrar a arreglarlo. (permisosEfectivos ya lo trata
  // como total pase lo que pase, pero conviene no dejar la fila mintiendo.)
  if (nombre === ROL_TOTAL) {
    return res.status(403).json({ success: false, message: 'El rol de administración no se puede modificar' });
  }

  const color = COLOR_VALIDO.test(req.body?.color) ? req.body.color : null;
  const { rows } = await pool.query(
    `UPDATE roles SET permisos = $1::jsonb, color = COALESCE($2, color)
      WHERE nombre = $3 RETURNING *`,
    [JSON.stringify(permisosLimpios(req.body?.permisos)), color, nombre]
  );
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Rol no encontrado' });

  invalidarCacheRoles();
  await saveLog('info', `${req.user.matricula} modificó el rol ${nombre}.`);
  res.json(rows[0]);
});

app.delete('/api/roles/:nombre', verifyToken, requirePermiso('roles.gestionar'), csrfProtection, async (req, res) => {
  const nombre = req.params.nombre;

  const { rows: filas } = await pool.query('SELECT del_sistema FROM roles WHERE nombre = $1', [nombre]);
  if (!filas[0]) return res.status(404).json({ success: false, message: 'Rol no encontrado' });
  if (filas[0].del_sistema) {
    return res.status(403).json({ success: false, message: 'Ese rol es del sistema y no se puede borrar' });
  }

  // Borrar un rol que alguien lleva puesto lo dejaría con un permiso fantasma
  // en su fila: un nombre que ya no existe y que nadie resuelve. Se dice a
  // quién hay que quitárselo antes, en vez de romperlo en silencio.
  const { rows: enUso } = await pool.query(
    `SELECT nombre FROM users WHERE roles ? $1 ORDER BY nombre`, [nombre]
  );
  if (enUso.length > 0) {
    return res.status(409).json({
      success: false,
      message: `Todavía lo tienen ${enUso.length} persona(s): ${enUso.map((u) => u.nombre).join(', ')}`,
    });
  }

  await pool.query('DELETE FROM roles WHERE nombre = $1', [nombre]);
  invalidarCacheRoles();
  await saveLog('warning', `${req.user.matricula} borró el rol ${nombre}.`);
  res.json({ success: true });
});

// Otorgar o retirar Excelencia.
//
// Es la única medalla que no sale de los datos, así que se guarda quién la
// dio: sin ese nombre detrás, una medalla que cualquiera puede repartir no
// vale más que un adorno.
app.put('/api/miembros/:id/excelencia', verifyToken, requirePermiso('usuarios.gestionar'), csrfProtection, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
  }
  const id = Number.parseInt(req.params.id, 10);
  const motivo = String(req.body?.motivo ?? '').trim().slice(0, 500);

  if (req.body?.otorgar === false) {
    await pool.query('DELETE FROM medallas_otorgadas WHERE user_id = $1 AND clave = $2', [id, 'excelencia']);
    await saveLog('info', `${req.user.matricula} retiró la medalla de excelencia al usuario ${id}.`);
    return res.json({ success: true, otorgada: false });
  }

  if (!motivo) {
    return res.status(400).json({ success: false, message: 'Hace falta el motivo: una medalla sin motivo no se puede leer.' });
  }

  await pool.query(
    `INSERT INTO medallas_otorgadas (user_id, clave, motivo, otorgada_por)
     VALUES ($1, 'excelencia', $2, $3)
     ON CONFLICT (user_id, clave) DO UPDATE SET motivo = EXCLUDED.motivo,
       otorgada_por = EXCLUDED.otorgada_por, fecha = now()`,
    [id, motivo, req.user.nombre || req.user.matricula]
  );
  await saveLog('success', `${req.user.matricula} otorgó la medalla de excelencia al usuario ${id}.`);
  res.json({ success: true, otorgada: true });
});

// A quién se puede firmar en una publicación.
//
// No vale /api/users: ese es de administración y devuelve matrícula, grupo y
// roles. Aquí hace falta lo mínimo para poner un nombre en una lista, y nada
// más. Requiere sesión de administración porque enumera todas las cuentas,
// incluidas las que no han querido perfil público.
app.get('/api/personas', verifyToken, requirePermiso('publicaciones.firmar'), noStore, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, CASE WHEN u.show_alias AND u.alias <> '' THEN u.alias ELSE u.nombre END AS nombre,
            (SELECT motivo FROM medallas_otorgadas m
              WHERE m.user_id = u.id AND m.clave = 'excelencia') AS excelencia
       FROM users u ORDER BY nombre`
  );
  res.json(rows);
});

app.get('/api/users', verifyToken, requirePermiso('usuarios.gestionar'), noStore, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.matricula, u.nombre, u.grupo, u.roles, u.alias, u.permisos_extra,
            (SELECT motivo FROM medallas_otorgadas m
              WHERE m.user_id = u.id AND m.clave = 'excelencia') AS excelencia
       FROM users u ORDER BY u.matricula`
  );
  res.json(rows);
});

app.post('/api/users', verifyToken, requirePermiso('usuarios.gestionar'), csrfProtection, async (req, res) => {
  const { matricula, password, nombre, roles, grupo, alias } = req.body ?? {};
  if (!matricula || !password || !nombre) {
    return res.status(400).json({ message: 'matricula, password y nombre son requeridos' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // ON CONFLICT DO NOTHING + comprobar rowCount en vez de un SELECT previo
  // seguido de INSERT: dos altas concurrentes con la misma matrícula ya no
  // pueden colarse entre el chequeo y el INSERT.
  const { rows } = await pool.query(
    `INSERT INTO users (matricula, password_hash, nombre, roles, grupo, alias)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (matricula) DO NOTHING
     RETURNING matricula`,
    [matricula, passwordHash, nombre, JSON.stringify(roles || []), grupo || 'GENERAL', alias || '']
  );
  if (rows.length === 0) {
    return res.status(400).json({ message: 'La matrícula ya existe' });
  }

  await saveLog('info', `Administrador ${req.user.matricula} creó el usuario ${matricula}.`);
  res.json({ success: true, message: 'Usuario creado' });
});

app.put('/api/users/:matricula', verifyToken, requirePermiso('usuarios.gestionar'), csrfProtection, async (req, res) => {
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
      ? await bcrypt.hash(req.body.password, 10)
      : existingUser.password_hash;

  // Permisos sueltos de esta persona, además de los que le den sus roles. Se
  // filtran contra el catálogo: uno inventado no abriría nada, pero quedaría
  // guardado dando a entender lo contrario.
  const permisosExtra = req.body.permisos_extra !== undefined
    ? [...new Set((req.body.permisos_extra ?? []).filter(ES_PERMISO))]
    : (existingUser.permisos_extra ?? []);

  // Nadie puede quitarse a sí mismo la llave de casa.
  //
  // Borrarse ya estaba impedido; esto cierra el otro camino, que era peor
  // porque no lo parecía: bastaba con desmarcar la casilla de tu propio rol
  // para dejar el sistema sin nadie capaz de repartir permisos, y sin ninguna
  // forma de volver a entrar salvo editando Postgres a mano.
  //
  // Solo se comprueba sobre uno mismo: quitarle la administración a OTRO
  // administrador es una decisión legítima.
  if (matricula === req.user.matricula) {
    const seguira = permisosEfectivos(roles, await rolesDefinidos(), permisosExtra);
    if (!seguira.has('usuarios.gestionar')) {
      return res.status(400).json({
        success: false,
        message: 'No puedes quitarte a ti mismo la gestión de usuarios: te quedarías sin poder volver a entrar. Pídeselo a otro administrador.',
      });
    }
  }

  await pool.query(
    `UPDATE users SET nombre = $1, roles = $2::jsonb, grupo = $3, alias = $4, password_hash = $5,
       permisos_extra = $6::jsonb
     WHERE matricula = $7`,
    [nombre, JSON.stringify(roles), grupo, alias, passwordHash, JSON.stringify(permisosExtra), matricula]
  );
  await saveLog('info', `Administrador ${req.user.matricula} modificó el usuario ${matricula}.`);
  res.json({ success: true, message: 'Usuario actualizado correctamente' });
});

app.delete('/api/users/:matricula', verifyToken, requirePermiso('usuarios.gestionar'), csrfProtection, async (req, res) => {
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
