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

// verifyToken: exige sesión válida. Sustituye al middleware que leía
// "Authorization: Bearer <token>" — ahora el token viaja en una cookie
// httpOnly que el navegador adjunta solo, sin que JS del frontend lo toque.
export const verifyToken = (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(403).json({ success: false, message: 'Se requiere sesión activa' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: 'Sesión inválida o expirada' });
    req.user = decoded;
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
