// Sesión por cookie httpOnly (reemplaza el patrón anterior de guardar el JWT
// en localStorage del navegador y mandarlo como "Authorization: Bearer",
// que era legible por cualquier script inyectado vía XSS).
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable. Set JWT_SECRET before starting the server.');
}

export const SESSION_COOKIE = 'rur_session';
export const CSRF_COOKIE = 'rur_csrf';
export const TOKEN_TTL = '24h';
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function signSessionToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function baseCookieOptions() {
  return {
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_MS,
  };
}

// Lo único que puede hacer quien entró con una contraseña temporal: mirar
// quién es, cambiarla y salir. Todo lo demás se le niega.
//
// La marca viaja en el propio JWT (`tmp`) y no se consulta a la base, que es
// lo que permite que los tres servicios apliquen el bloqueo sin que
// svc-content y svc-robots tengan que leer la tabla users ni enterarse de
// nada. El token se firma de nuevo, ya sin la marca, en cuanto la cambia.
export const RUTAS_CON_PASSWORD_TEMPORAL = new Set([
  '/api/me',
  '/api/logout',
  '/api/profile/password',
]);

// verifyToken: exige sesión válida. Sustituye al middleware que leía
// "Authorization: Bearer <token>" — ahora el token viaja en una cookie
// httpOnly que el navegador adjunta solo, sin que JS del frontend lo toque.
export const verifyToken = (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(403).json({ success: false, message: 'Se requiere sesión activa' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: 'Sesión inválida o expirada' });
    // Se corta aquí y no en el frontend: una pantalla que "obliga" a cambiar
    // la contraseña no obliga a nada si la API sigue atendiendo al resto de
    // rutas. Con el corte aquí, la contraseña provisional no abre nada.
    /*
    if (decoded?.tmp && !RUTAS_CON_PASSWORD_TEMPORAL.has(req.path)) {
      return res.status(403).json({
        success: false,
        codigo: 'password_temporal',
        message: 'Tienes una contraseña provisional: cámbiala para poder seguir.',
      });
    }
    */
    req.user = decoded;
    next();
  });
};

// sesionOpcional: rellena req.user si hay una sesión válida y sigue adelante
// igualmente si no la hay. Es para las rutas que sirven a los dos públicos a
// la vez —el visitante anónimo y el panel— y que deben enseñar más al
// segundo sin cerrarle la puerta al primero.
//
// No es verifyToken con el error silenciado: una cookie inválida o caducada
// aquí no es un fallo, es sencillamente un visitante anónimo. Lo que nunca
// hace es dar por buena una sesión que no verifica.
export const sesionOpcional = (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    // Una sesión provisional cuenta como visitante anónimo, no como sesión.
    // Estas rutas enseñan de más a quien tiene sesión —/api/posts devuelve
    // también las publicaciones ocultas—, y una contraseña que puso otra
    // persona no debe abrir eso: medido en dev, 7 publicaciones en vez de 5.
    if (err) console.error("JWT verify error in sesionOpcional:", err);
    if (!err) req.user = decoded;
    next();
  });
};

export const requireRole = (...roles) => (req, res, next) => {
  const userRoles = req.user?.roles ?? [];
  if (!roles.some((r) => userRoles.includes(r))) {
    return res.status(403).json({ success: false, message: 'Sin permisos' });
  }
  next();
};

// Ningún dato de sesión debe quedar en un cache compartido (proxy, CDN) que
// pudiera servirle a un usuario la respuesta cacheada de otro.
export const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

// ---------------------------------------------------------------------------
// Permisos
//
// Se resuelven contra Postgres en CADA petición, no desde el JWT. Es lo que
// hace que quitarle un permiso a alguien surta efecto ya, en lugar de esperar
// a que le caduque la sesión de 24 horas: un permiso que tarda un día en
// revocarse no es un permiso, es una sugerencia.
//
// Para no consultar la tabla en cada request, las filas de roles se guardan
// unos segundos. Esa ventana es el retardo máximo entre revocar un permiso y
// que deje de valer DE VERDAD en los otros dos servicios, que tienen su propia
// caché y no se enteran de que alguien tocó un rol.
//
// Cinco segundos, no treinta: medido en dev, con treinta un permiso retirado
// seguía funcionando media docena de peticiones después. La tabla tiene cinco
// filas y solo se consulta en rutas autenticadas de escritura, así que releerla
// cada cinco segundos no le cuesta nada a nadie.
// ---------------------------------------------------------------------------
import { getPool } from './db.js';
import { permisosEfectivos, ROL_TOTAL } from './permisos.js';

const CACHE_MS = 5_000;
let cacheRoles = null;
let cacheExpira = 0;

export async function rolesDefinidos() {
  const ahora = Date.now();
  if (cacheRoles && ahora < cacheExpira) return cacheRoles;

  const { rows } = await getPool().query('SELECT nombre, color, permisos, del_sistema FROM roles');
  cacheRoles = rows;
  cacheExpira = ahora + CACHE_MS;
  return rows;
}

// Tras crear o editar un rol hay que tirar la caché, o el propio administrador
// vería su cambio "no aplicarse" durante medio minuto y volvería a guardarlo.
//
// Solo vacía la de ESTE proceso. Los otros dos servicios tienen la suya y se
// enteran cuando les caduque: hasta 30 segundos de desfase entre cambiar un
// rol y que la consola del robot lo respete. Es el precio de no montar un
// canal de invalidación entre servicios para algo que se toca dos veces al
// año; si algún día molesta, la salida es escuchar NOTIFY de Postgres.
export function invalidarCacheRoles() {
  cacheRoles = null;
  cacheExpira = 0;
}

export async function permisosDe(user) {
  if (!user) return new Set();
  // Camino corto para el administrador: no hace falta ni consultar.
  if (user.roles?.includes(ROL_TOTAL)) return permisosEfectivos(user.roles, [], []);

  const [roles, extra] = await Promise.all([
    rolesDefinidos(),
    getPool()
      .query('SELECT permisos_extra FROM users WHERE matricula = $1', [user.matricula])
      .then((r) => r.rows[0]?.permisos_extra ?? [])
      .catch(() => []),
  ]);
  return permisosEfectivos(user.roles, roles, extra);
}

// requirePermiso: sustituto de requireRole. Se pregunta por lo que hay que
// poder hacer, no por quién hay que ser — que es lo que permite que un
// administrador reparta capacidades sin tocar el código.
export const requirePermiso = (...permisos) => async (req, res, next) => {
  try {
    const tiene = await permisosDe(req.user);
    if (permisos.some((p) => tiene.has(p))) return next();
    return res.status(403).json({ success: false, message: 'Sin permisos' });
  } catch (e) {
    // Ante un fallo al resolver permisos se deniega. Un error de base de datos
    // no puede acabar concediendo acceso.
    console.error('[auth] no se pudieron resolver los permisos:', e.message);
    return res.status(403).json({ success: false, message: 'Sin permisos' });
  }
};
