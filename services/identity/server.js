import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { generateSecret, verifySync, generateURI, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import QRCode from 'qrcode';
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
import { medallasDe } from '../shared/medallas.js';
import { validarPassword, generarPasswordTemporal } from '../shared/password.js';
import { loginIpLimiter, cambioPasswordLimiter, isLocked, lockedRemainingMs, recordFailure, recordSuccess } from '../shared/loginProtection.js';
import { saveLog } from '../shared/logs.js';

const app = express();
app.set('trust proxy', 1); // Caddy es el único proxy delante
const PORT = process.env.PORT || 3001;
const pool = getPool();

// Hash "de relleno" para comparar contra él cuando la matrícula no existe:
// sin esto, un intento contra una cuenta inexistente respondía casi
// instantáneo (se saltaba bcrypt.compare por completo) mientras uno contra
// una cuenta real tardaba lo que tarda bcrypt -- una diferencia de tiempo
// que deja enumerar matrículas válidas sin necesidad del log de auditoría.
// Calculado una sola vez al arrancar el proceso, no en cada request.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('sin-cuenta-que-comparar', 10);

// Cuánto vale una contraseña provisional. 72 horas: lo bastante para que
// alguien la reciba un viernes y la use el lunes, y lo bastante poco para que
// no se quede viva en un chat durante meses.
const VIGENCIA_PROVISIONAL = '72 hours';

app.use(cors({ origin: IS_PRODUCTION ? (process.env.CORS_ORIGIN || false) : true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
// csrfProtection se aplica por ruta, no global: /api/login no tiene sesión
// previa que proteger (nada que un CSRF pueda "montar" todavía).

app.get('/api/hello', (req, res) => {
  res.json({ message: 'svc-identity ok' });
});

app.post('/api/login', loginIpLimiter, async (req, res) => {
  const { matricula, password, code } = req.body ?? {};
  if (!matricula) {
    return res.status(400).json({ success: false, message: 'La matrícula es requerida' });
  }

  // The frontend sends the same value in `password` and `code` to unify the login field
  const credential = code || password;
  if (!credential) {
    return res.status(400).json({ success: false, message: 'La credencial de acceso es requerida' });
  }

  if (isLocked(matricula)) {
    const waitSec = Math.ceil(lockedRemainingMs(matricula) / 1000);
    return res.status(429).json({ success: false, message: `Demasiados intentos fallidos. Espera ${waitSec}s.` });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE matricula = $1', [matricula]);
  const userRecord = rows[0];

  let isMatch = false;

  if (userRecord && userRecord.totp_enabled) {
    // Modo Passwordless 2FA
    try {
      isMatch = verifySync({ token: credential, secret: userRecord.totp_secret, crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() }).valid;
    } catch (e) {
      isMatch = false;
    }
    await bcrypt.compare('dummy', DUMMY_PASSWORD_HASH); // previene timing attacks
  } else {
    // Modo Tradicional
    const passwordMatch = await bcrypt.compare(credential, userRecord ? userRecord.password_hash : DUMMY_PASSWORD_HASH);
    isMatch = Boolean(userRecord) && passwordMatch;
  }

  // Las contraseñas temporales caducadas ya solo aplican si no tiene 2FA encendido
  if (userRecord && isMatch && !userRecord.totp_enabled && userRecord.password_temporal
      && userRecord.password_expira && new Date(userRecord.password_expira) < new Date()) {
    recordFailure(matricula);
    await saveLog('warning', `Contraseña provisional caducada para ${matricula}.`);
    return res.status(401).json({
      success: false,
      message: 'Tu contraseña provisional caducó. Pídele otra a un administrador.',
    });
  }

  if (userRecord && isMatch) {
    recordSuccess(matricula);
    const user = toPublicUser(userRecord);
    const token = signSessionToken({
      id: user.id,
      matricula: user.matricula,
      nombre: user.nombre,
      roles: user.roles,
      grupo: user.grupo,
      ...(userRecord.password_temporal && !userRecord.totp_enabled ? { tmp: true } : {}),
    });
    const csrfToken = generateCsrfToken();

    res.cookie(SESSION_COOKIE, token, { ...baseCookieOptions(), httpOnly: true });
    res.cookie(CSRF_COOKIE, csrfToken, { ...baseCookieOptions(), httpOnly: false });

    await saveLog('success', `Usuario ${user.nombre} (${matricula}) inició sesión exitosamente.`);
    return res.json({ success: true, user });
  }

  recordFailure(matricula);
  if (userRecord) {
    await saveLog('error', `Intento de acceso fallido para ${matricula} (Credencial incorrecta).`);
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
    // Lo que el panel necesita para llevarle directo a la pantalla de cambio.
    // No es lo que lo impone —eso lo hace verifyToken con la marca del token—,
    // es para que se lo encuentre explicado en vez de a golpe de error.
    debe_cambiar_password: row.password_temporal ?? false,
    // Si esta cuenta entra ya con autenticador. Va el booleano, nunca
    // totp_secret: con el secreto, cualquiera que viera esta respuesta podría
    // generar los códigos. Sin el booleano, el panel no puede ofrecer
    // «Quitar 2FA» ni dejar de proponer una vinculación que ya está hecha.
    totp_enabled: row.totp_enabled ?? false,
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
  // Datos del perfil público: cada quien escribe los suyos, estén publicados
  // o no. Se rellenan antes de que la cuenta sea visible, no después.
  //
  // `perfil_publico` NO está aquí a propósito: quién sale en MIEMBROS lo
  // decide quien administra, desde el panel de personal. La lista blanca es
  // lo que lo impide de verdad — un PUT con {"perfil_publico":true} se ignora
  // igual que uno con {"roles":["admin"]}.
  rol_publico: { kind: 'text', maxLength: 80 },
  area: { kind: 'text', maxLength: 80 },
  generacion: { kind: 'text', maxLength: 20 },
  // De estos tres, y solo de estos tres, un administrador también puede
  // escribir los de otra persona (PUT /api/users/:matricula). Es lo que se ve
  // en su ficha pública; el resto de este bloque sigue siendo suyo y nada más.
  show_alias: { kind: 'boolean' },
  push_notifications: { kind: 'boolean' },
  large_text: { kind: 'boolean' },
  reduce_animations: { kind: 'boolean' },
};

const CAMPOS_FICHA_PUBLICA = ['rol_publico', 'area', 'generacion'];

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

// Cambiar la propia contraseña.
//
// La razón de que exista: hasta ahora la única forma era pedírsela a un
// administrador, que la escribía y por tanto la sabía. Aquí no la sabe nadie
// más que su dueño.
//
// Pide siempre la actual, incluso a quien acaba de entrar con una provisional
// —la acaba de teclear, no le cuesta nada—: sin eso, una sesión robada podría
// cambiar la contraseña y quedarse la cuenta.
app.put('/api/profile/password', verifyToken, cambioPasswordLimiter, csrfProtection, noStore, async (req, res) => {
  const actual = String(req.body?.actual ?? '');
  const nueva = String(req.body?.nueva ?? '');

  const { rows } = await pool.query('SELECT * FROM users WHERE matricula = $1', [req.user.matricula]);
  const fila = rows[0];
  if (!fila) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

  if (!actual || !(await bcrypt.compare(actual, fila.password_hash))) {
    await saveLog('warning', `Cambio de contraseña rechazado para ${req.user.matricula}: la actual no coincide.`);
    return res.status(400).json({ success: false, message: 'Tu contraseña actual no es correcta.' });
  }

  const revisada = validarPassword(nueva, {
    matricula: fila.matricula, nombre: fila.nombre, alias: fila.alias,
  });
  if (!revisada.ok) return res.status(400).json({ success: false, message: revisada.error });

  // Cambiarla por la misma deja la sensación de haberla cambiado sin haberlo
  // hecho, que es peor que no dejar hacerlo.
  if (await bcrypt.compare(nueva, fila.password_hash)) {
    return res.status(400).json({ success: false, message: 'La contraseña nueva es igual a la actual.' });
  }

  const hash = await bcrypt.hash(nueva, 10);
  const { rows: actualizado } = await pool.query(
    `UPDATE users SET password_hash = $1, password_temporal = false, password_expira = NULL,
       password_changed_at = now()
     WHERE matricula = $2 RETURNING *`,
    [hash, req.user.matricula]
  );

  // Token nuevo sin la marca `tmp`, o quien acaba de cambiar una provisional
  // seguiría bloqueado en la pantalla de cambio con todo ya hecho. Se renueva
  // también el de CSRF: la sesión es otra a partir de aquí.
  const user = toPublicUser(actualizado[0]);
  const token = signSessionToken({
    id: user.id, matricula: user.matricula, nombre: user.nombre,
    roles: user.roles, grupo: user.grupo,
  });
  res.cookie(SESSION_COOKIE, token, { ...baseCookieOptions(), httpOnly: true });
  res.cookie(CSRF_COOKIE, generateCsrfToken(), { ...baseCookieOptions(), httpOnly: false });

  await saveLog('success', `${req.user.matricula} cambió su contraseña.`);
  const permisos = await permisosDe({ matricula: user.matricula, roles: user.roles });
  res.json({ success: true, user: { ...user, permisos: [...permisos] } });
});

app.get('/api/profile/2fa/generate', verifyToken, noStore, async (req, res) => {
  const secret = generateSecret(20);
  const otpauth = generateURI({ secret, accountName: req.user.matricula, issuer: 'RUR Robotics' });
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
    res.json({ success: true, secret, otpauth, qrCodeDataUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error generando QR' });
  }
});

app.post('/api/profile/2fa/enable', verifyToken, csrfProtection, noStore, async (req, res) => {
  const { code, secret } = req.body ?? {};
  if (!code || !secret) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }

  let isValid = false;
  try {
    isValid = verifySync({ token: code, secret, crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() }).valid;
  } catch(e) {}
  
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'El código no es válido' });
  }

  await pool.query(
    'UPDATE users SET totp_secret = $1, totp_enabled = true, password_hash = NULL, password_temporal = false WHERE matricula = $2',
    [secret, req.user.matricula]
  );

  await saveLog('info', `${req.user.matricula} activó Passwordless 2FA.`);
  res.json({ success: true, message: 'Autenticación configurada exitosamente' });
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
                                              'papel', pm.papel, 'lider', pm.lider,
                                              'imagen', p.image)
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
function aMiembroPublico(r, catalogo) {
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
    medallas: medallasDe(r.proyectos ?? [], r.otorgadas ?? [], catalogo),
  };
}

app.get('/api/miembros', async (req, res) => {
  const { rows } = await pool.query(
    `${SELECT_MIEMBRO} WHERE u.perfil_publico IS TRUE ORDER BY u.area NULLS LAST, u.nombre`
  );
  // Una sola lectura del catálogo para toda la lista, no una por persona.
  const catalogo = await catalogoMedallas();
  res.json(rows.map((r) => aMiembroPublico(r, catalogo)));
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
  res.json(aMiembroPublico(rows[0], await catalogoMedallas()));
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

// El catálogo de medallas. Sale de la tabla, no de una lista en el código:
// crear una medalla nueva es cosa del panel, no de un despliegue.
//
// Se guarda unos segundos porque se pide en cada perfil público, que es la
// página más visitada de la sección.
const CACHE_MEDALLAS_MS = 5_000;
let cacheMedallas = null;
let cacheMedallasExpira = 0;

async function catalogoMedallas() {
  const ahora = Date.now();
  if (cacheMedallas && ahora < cacheMedallasExpira) return cacheMedallas;
  const { rows } = await pool.query(
    'SELECT clave, nombre, descripcion, icono, color, automatica, del_sistema, orden FROM medallas ORDER BY orden, nombre'
  );
  cacheMedallas = rows;
  cacheMedallasExpira = ahora + CACHE_MEDALLAS_MS;
  return rows;
}

function invalidarCacheMedallas() {
  cacheMedallas = null;
  cacheMedallasExpira = 0;
}

// Cualquier sesión puede leerlo: el editor de usuario necesita los nombres y
// los criterios para conceder. Crearlas y editarlas sí exige permiso.
app.get('/api/medallas', verifyToken, noStore, async (req, res) => {
  res.json({ medallas: await catalogoMedallas() });
});

const CLAVE_MEDALLA = /^[a-z0-9_-]{2,40}$/;
const COLOR_MEDALLA = /^#[0-9a-fA-F]{6}$/;

// El icono es un solo símbolo. Se limita a un puñado de caracteres porque va
// dentro de un círculo de 22px: un emoji a color o un texto de tres letras se
// salen del círculo y rompen la fila de medallas de la tarjeta.
const ICONOS_VALIDOS = ['▲','◆','★','✦','◈','❖','◉','●','■','⬟','✚','⚑','☗','◐','✱','⬤'];

function medallaDelCuerpo(body) {
  const nombre = String(body?.nombre ?? '').trim().slice(0, 80);
  if (!nombre) return { ok: false, error: 'La medalla necesita un nombre.' };
  const icono = ICONOS_VALIDOS.includes(body?.icono) ? body.icono : ICONOS_VALIDOS[3];
  const color = COLOR_MEDALLA.test(body?.color) ? body.color : '#fbbf24';
  const descripcion = String(body?.descripcion ?? '').trim().slice(0, 300);
  if (!descripcion) {
    return { ok: false, error: 'Escribe qué reconoce: es el criterio que se lee al concederla.' };
  }
  const orden = Number.isInteger(body?.orden) ? body.orden : 100;
  return { ok: true, valor: { nombre, icono, color, descripcion, orden } };
}

app.post('/api/medallas', verifyToken, requirePermiso('medallas.gestionar'), csrfProtection, async (req, res) => {
  const clave = String(req.body?.clave ?? '').trim().toLowerCase();
  // Misma regla que los roles: la clave se guarda en medallas_otorgadas y se
  // compara en varios sitios, así que nada de texto libre con espacios.
  if (!CLAVE_MEDALLA.test(clave)) {
    return res.status(400).json({ success: false, message: 'Clave inválida: solo letras, números, guion y guion bajo.' });
  }
  const revisada = medallaDelCuerpo(req.body);
  if (!revisada.ok) return res.status(400).json({ success: false, message: revisada.error });
  const { nombre, icono, color, descripcion, orden } = revisada.valor;

  // Las que se crean desde el panel son siempre otorgables. Una automática
  // necesita una regla escrita en código; marcarla aquí produciría una medalla
  // que no se le concede nunca a nadie y que nadie entendería por qué falta.
  try {
    const { rows } = await pool.query(
      `INSERT INTO medallas (clave, nombre, descripcion, icono, color, automatica, del_sistema, orden)
       VALUES ($1, $2, $3, $4, $5, false, false, $6) RETURNING *`,
      [clave, nombre, descripcion, icono, color, orden]
    );
    invalidarCacheMedallas();
    await saveLog('info', `${req.user.matricula} creó la medalla ${nombre}.`);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, message: 'Ya existe una medalla con esa clave' });
    throw e;
  }
});

app.put('/api/medallas/:clave', verifyToken, requirePermiso('medallas.gestionar'), csrfProtection, async (req, res) => {
  const revisada = medallaDelCuerpo(req.body);
  if (!revisada.ok) return res.status(400).json({ success: false, message: revisada.error });
  const { nombre, icono, color, descripcion, orden } = revisada.valor;

  // `automatica` y `del_sistema` no se tocan desde aquí: dependen de si hay
  // una regla en el código, no de lo que mande el cliente.
  const { rows } = await pool.query(
    `UPDATE medallas SET nombre = $1, descripcion = $2, icono = $3, color = $4, orden = $5
      WHERE clave = $6 RETURNING *`,
    [nombre, descripcion, icono, color, orden, req.params.clave]
  );
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Medalla no encontrada' });

  invalidarCacheMedallas();
  await saveLog('info', `${req.user.matricula} modificó la medalla ${nombre}.`);
  res.json(rows[0]);
});

app.delete('/api/medallas/:clave', verifyToken, requirePermiso('medallas.gestionar'), csrfProtection, async (req, res) => {
  const { clave } = req.params;
  const { rows: filas } = await pool.query('SELECT nombre, del_sistema FROM medallas WHERE clave = $1', [clave]);
  if (!filas[0]) return res.status(404).json({ success: false, message: 'Medalla no encontrada' });
  if (filas[0].del_sistema) {
    return res.status(403).json({
      success: false,
      message: 'Esa medalla se calcula sola desde los proyectos: su regla está en el código y borrarla la dejaría a medias.',
    });
  }

  // Borrarla mientras alguien la lleva puesta le quitaría un reconocimiento de
  // paso. Se dice a cuántos hay que retirársela antes, en vez de un "no se
  // pudo borrar" que no explica nada.
  const { rows: cuenta } = await pool.query(
    'SELECT count(*)::int AS n FROM medallas_otorgadas WHERE clave = $1', [clave]
  );
  if (cuenta[0].n > 0) {
    return res.status(409).json({
      success: false,
      message: `No se puede borrar: ${cuenta[0].n} persona(s) la tienen otorgada. Retírasela primero desde su ficha.`,
    });
  }

  await pool.query('DELETE FROM medallas WHERE clave = $1', [clave]);
  invalidarCacheMedallas();
  await saveLog('warning', `${req.user.matricula} borró la medalla ${filas[0].nombre}.`);
  res.json({ success: true });
});

// Otorgar o retirar una medalla especial.
//
// Solo las especiales pasan por aquí: las automáticas salen de los proyectos
// firmados y no hay nada que conceder — otorgar "Líder" a mano sería poder
// mentir sobre un dato que está en la base.
//
// Se guarda quién la dio: sin ese nombre detrás, una medalla que cualquiera
// puede repartir no vale más que un adorno.
app.put('/api/miembros/:id/medallas/:clave', verifyToken, requirePermiso('usuarios.gestionar'), csrfProtection, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
  }
  const id = Number.parseInt(req.params.id, 10);
  const { clave } = req.params;
  // Contra la tabla, no contra una lista del código: si no, una medalla creada
  // desde el panel no se podría conceder nunca.
  const medalla = (await catalogoMedallas()).find((m) => m.clave === clave);
  if (!medalla || medalla.automatica) {
    return res.status(400).json({ success: false, message: 'Esa medalla no se otorga: o no existe, o se calcula sola desde los proyectos.' });
  }
  const nombreMedalla = medalla.nombre;
  const motivo = String(req.body?.motivo ?? '').trim().slice(0, 500);

  if (req.body?.otorgar === false) {
    await pool.query('DELETE FROM medallas_otorgadas WHERE user_id = $1 AND clave = $2', [id, clave]);
    await saveLog('info', `${req.user.matricula} retiró la medalla de ${nombreMedalla} al usuario ${id}.`);
    return res.json({ success: true, otorgada: false });
  }

  if (!motivo) {
    return res.status(400).json({ success: false, message: 'Hace falta el motivo: una medalla sin motivo no se puede leer.' });
  }

  await pool.query(
    `INSERT INTO medallas_otorgadas (user_id, clave, motivo, otorgada_por)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, clave) DO UPDATE SET motivo = EXCLUDED.motivo,
       otorgada_por = EXCLUDED.otorgada_por, fecha = now()`,
    [id, clave, motivo, req.user.nombre || req.user.matricula]
  );
  await saveLog('success', `${req.user.matricula} otorgó la medalla de ${nombreMedalla} al usuario ${id}.`);
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
    `SELECT u.id, CASE WHEN u.show_alias AND u.alias <> '' THEN u.alias ELSE u.nombre END AS nombre
       FROM users u ORDER BY nombre`
  );
  res.json(rows);
});

app.get('/api/users', verifyToken, requirePermiso('usuarios.gestionar'), noStore, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.matricula, u.nombre, u.grupo, u.roles, u.alias, u.permisos_extra,
            u.perfil_publico, u.rol_publico, u.area, u.generacion,
            -- Quién entra con autenticador. Es lo que decide si la ficha
            -- ofrece «Quitar 2FA»; el secreto no sale de la base nunca.
            u.totp_enabled, u.password_temporal,
            -- Las especiales que ya tiene, con su motivo: { clave: motivo }.
            -- Así el editor puede abrirse con lo que hay escrito en vez de
            -- pedirlo persona a persona. Las automáticas no vienen: no se
            -- otorgan desde aquí, así que no hay nada que editar.
            COALESCE(
              (SELECT json_object_agg(m.clave, COALESCE(m.motivo, ''))
                 FROM medallas_otorgadas m WHERE m.user_id = u.id),
              '{}'::json
            ) AS medallas
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
  // La primera contraseña de una cuenta nace provisional, siempre: la escribió
  // otra persona, así que hasta que su dueño la cambie hay dos que la saben.
  // ON CONFLICT DO NOTHING + comprobar rowCount en vez de un SELECT previo
  // seguido de INSERT: dos altas concurrentes con la misma matrícula ya no
  // pueden colarse entre el chequeo y el INSERT.
  const { rows } = await pool.query(
    `INSERT INTO users (matricula, password_hash, nombre, roles, grupo, alias,
                        password_temporal, password_expira)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, true, now() + $7::interval)
     ON CONFLICT (matricula) DO NOTHING
     RETURNING matricula`,
    [matricula, passwordHash, nombre, JSON.stringify(roles || []), grupo || 'GENERAL', alias || '',
     VIGENCIA_PROVISIONAL]
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
  // Si el admin escribe una contraseña, nace provisional y con caducidad. Si
  // deja el campo en blanco, no se toca nada de esto: editar el nombre de
  // alguien no puede echarlo a la pantalla de cambiar contraseña.
  const cambiaPassword = Boolean(req.body.password && req.body.password.trim() !== '');
  const passwordHash = cambiaPassword
    ? await bcrypt.hash(req.body.password, 10)
    : existingUser.password_hash;

  // Permisos sueltos de esta persona, además de los que le den sus roles. Se
  // filtran contra el catálogo: uno inventado no abriría nada, pero quedaría
  // guardado dando a entender lo contrario.
  const permisosExtra = req.body.permisos_extra !== undefined
    ? [...new Set((req.body.permisos_extra ?? []).filter(ES_PERMISO))]
    : (existingUser.permisos_extra ?? []);

  // Si esta cuenta aparece o no en MIEMBROS. Vive aquí y no en /api/profile
  // porque publicar a alguien en la web del laboratorio es una decisión de la
  // unidad, no del interesado.
  const perfilPublico = req.body.perfil_publico !== undefined
    ? Boolean(req.body.perfil_publico)
    : existingUser.perfil_publico;

  // Los textos de la ficha pública (a qué se dedica, área, generación).
  //
  // Los escribe cada quien desde su perfil, y esa sigue siendo la vía
  // normal. Pero solo desde ahí dejaba a quien administra en una posición
  // absurda: podía publicar a alguien en MIEMBROS y no tenía forma de
  // rellenarle la ficha, así que salía con el nombre y un hueco donde va el
  // rol hasta que su dueño entrara a escribirlo. Quien publica tiene que
  // poder completar lo que publica.
  //
  // Pasan por el mismo saneado y los mismos topes que en /api/profile: es la
  // misma columna, no puede admitir más por venir de un administrador. Y solo
  // se tocan las que vengan en el cuerpo — guardar el formulario del editor
  // no puede borrar lo que la persona escribió por su cuenta.
  const ficha = {};
  for (const campo of CAMPOS_FICHA_PUBLICA) {
    if (req.body[campo] === undefined) {
      ficha[campo] = existingUser[campo];
      continue;
    }
    const checked = sanitizeProfileField(PROFILE_FIELDS[campo], req.body[campo]);
    if (!checked.ok) {
      return res.status(400).json({ success: false, message: `${campo}: ${checked.error}` });
    }
    ficha[campo] = checked.value;
  }

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
       permisos_extra = $6::jsonb, perfil_publico = $7,
       rol_publico = $8, area = $9, generacion = $10,
       password_temporal = CASE WHEN $11::boolean THEN true ELSE password_temporal END,
       password_expira   = CASE WHEN $11::boolean THEN now() + $12::interval ELSE password_expira END,
       -- Escribirle una contraseña a alguien que entra con autenticador lo
       -- devuelve al modo contraseña. Sin estas dos líneas la contraseña se
       -- guardaba pero totp_enabled seguía en true, así que el login solo
       -- aceptaba el código de seis dígitos: el administrador dictaba una
       -- contraseña que no servía para nada y la respuesta era un 200.
       -- Importa justo en el caso en que se usa —alguien perdió el teléfono—,
       -- que es cuando la persona ya no puede generar códigos.
       totp_enabled = CASE WHEN $11::boolean THEN false ELSE totp_enabled END,
       totp_secret  = CASE WHEN $11::boolean THEN NULL  ELSE totp_secret  END
     WHERE matricula = $13`,
    [nombre, JSON.stringify(roles), grupo, alias, passwordHash, JSON.stringify(permisosExtra), perfilPublico,
     ficha.rol_publico, ficha.area, ficha.generacion,
     cambiaPassword, VIGENCIA_PROVISIONAL, matricula]
  );
  if (cambiaPassword) {
    await saveLog('warning', `Administrador ${req.user.matricula} puso una contraseña provisional a ${matricula}.`);
    // Que quede escrito aparte: esto apaga el segundo factor de otra persona,
    // y por el camino de "editar usuario", no por el botón que lo anuncia.
    if (existingUser.totp_enabled) {
      await saveLog('warning', `La contraseña provisional desvinculó el 2FA de ${matricula}.`);
    }
  }
  await saveLog('info', `Administrador ${req.user.matricula} modificó el usuario ${matricula}.`);
  // Se registra aparte: publicar o retirar a alguien de la web es lo único de
  // esta ruta que cambia lo que ve un visitante, y conviene poder rastrearlo
  // sin releer la fila.
  if (perfilPublico !== existingUser.perfil_publico) {
    await saveLog('info', `Administrador ${req.user.matricula} ${perfilPublico ? 'publicó' : 'retiró'} el perfil de ${matricula} en MIEMBROS.`);
  }
  // Y por el mismo motivo, si le reescribió los textos de la ficha: son datos
  // de una persona, escritos por otra. Que quede quién lo hizo.
  // Los dos lados normalizados: en la base, "sin rellenar" es NULL en unas
  // filas y '' en otras, y compararlos en crudo daría por modificado un campo
  // que nadie tocó.
  const fichaCambiada = CAMPOS_FICHA_PUBLICA.filter(
    (c) => (ficha[c] ?? '') !== (existingUser[c] ?? '')
  );
  if (fichaCambiada.length > 0) {
    await saveLog('info', `Administrador ${req.user.matricula} editó la ficha pública de ${matricula} (${fichaCambiada.join(', ')}).`);
  }
  res.json({ success: true, message: 'Usuario actualizado correctamente' });
});

// Reiniciar la contraseña de otra persona.
//
// Es el reemplazo de "invéntate una y pásasela". La genera el servidor, se
// devuelve UNA vez para dictarla, y quien la recibe está obligado a cambiarla
// al entrar. Nunca se guarda en claro: lo que queda en la base es su bcrypt,
// igual que cualquier otra.
//
// Que la escoja el servidor no es capricho: las que se teclean a mano acaban
// siendo la misma para todo el mundo, y esa se queda circulando.
app.post('/api/users/:matricula/password-temporal', verifyToken, requirePermiso('usuarios.gestionar'), csrfProtection, noStore, async (req, res) => {
  const { matricula } = req.params;
  const { rows } = await pool.query('SELECT matricula FROM users WHERE matricula = $1', [matricula]);
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

  const temporal = generarPasswordTemporal();
  await pool.query(
    `UPDATE users SET password_hash = $1, password_temporal = true,
       password_expira = now() + $2::interval
     WHERE matricula = $3`,
    [await bcrypt.hash(temporal, 10), VIGENCIA_PROVISIONAL, matricula]
  );

  // El texto en claro sale de aquí y no vuelve a existir en ninguna parte: ni
  // en la base, ni en el registro de actividad. Del log queda el hecho, no la
  // contraseña.
  await saveLog('warning', `Administrador ${req.user.matricula} reinició la contraseña de ${matricula}.`);
  res.json({ success: true, password: temporal, horas: 72 });
});

app.delete('/api/users/:matricula/2fa', verifyToken, requirePermiso('usuarios.gestionar'), csrfProtection, async (req, res) => {
  const { matricula } = req.params;
  const { rows } = await pool.query('SELECT matricula FROM users WHERE matricula = $1', [matricula]);
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

  const temporal = generarPasswordTemporal();
  await pool.query(
    `UPDATE users SET totp_secret = NULL, totp_enabled = false, password_hash = $1,
       password_temporal = true, password_expira = now() + $2::interval
     WHERE matricula = $3`,
    [await bcrypt.hash(temporal, 10), VIGENCIA_PROVISIONAL, matricula]
  );

  await saveLog('warning', `Administrador ${req.user.matricula} desvinculó el 2FA de ${matricula}.`);
  res.json({ success: true, password: temporal });
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
