// CSRF por "double submit cookie": al iniciar sesión se manda un token
// aleatorio en una cookie legible por JS (rur_csrf, NO httpOnly a propósito).
// El frontend debe reenviarlo como header X-CSRF-Token en cada request que
// modifique estado; si no coincide con la cookie, se rechaza. La cookie de
// sesión (httpOnly) sola no alcanza para autenticar una mutación.
import crypto from 'crypto';
import { CSRF_COOKIE } from './auth.js';

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfProtection = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];

  if (
    !cookieToken ||
    !headerToken ||
    typeof headerToken !== 'string' ||
    cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    return res.status(403).json({ success: false, message: 'Token CSRF inválido o ausente' });
  }
  next();
};
