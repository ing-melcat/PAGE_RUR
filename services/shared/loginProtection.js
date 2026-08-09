// Protección contra fuerza bruta en /api/auth/login. api/server.js original
// no tenía ningún límite aquí (el express-rate-limit que ya estaba importado
// solo protegía /api/livekit-token) — visto en la revisión de seguridad.
//
// Dos capas:
//  1. Rate limit por IP (express-rate-limit): tope de intentos por ventana.
//  2. Bloqueo progresivo por matrícula: cada fallo consecutivo aumenta el
//     tiempo de espera, para no depender solo de la IP (un atacante con
//     muchas IPs igual queda limitado por cuenta).
//
// El estado del bloqueo por matrícula es en memoria del proceso: correcto
// para un solo replica. Si en la fase de réplicas (Caddy con 2 instancias
// de svc-identity) esto se vuelve un problema real, hay que mover este
// estado a Postgres o Redis — dejarlo anotado para esa fase.
import rateLimit from 'express-rate-limit';

export const loginIpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    success: false,
    message: 'Demasiados intentos desde esta red. Espera unos minutos.',
  }),
});

const attempts = new Map(); // matricula -> { failCount, lockedUntil, lastFailureAt }
const MAX_FAILS_BEFORE_LOCK = 5;
const BASE_LOCK_MS = 30 * 1000; // 30s, se duplica por cada fallo adicional
const MAX_LOCK_MS = 15 * 60 * 1000; // tope de 15 min

// Sin esto el Map crece sin límite: cualquiera que pruebe matrículas
// aleatorias e inexistentes deja una entrada por siempre (solo se borra en
// recordSuccess, que nunca llega para una cuenta que no existe). Se purgan
// las entradas que ya no están bloqueadas y llevan un rato sin fallar; las
// que siguen bloqueadas, o fallaron hace poco, se conservan tal cual.
const PURGA_INTERVALO_MS = 10 * 60 * 1000; // cada 10 min
const PURGA_INACTIVIDAD_MS = 30 * 60 * 1000; // sin fallos en los últimos 30 min

const purgaTimer = setInterval(() => {
  const ahora = Date.now();
  for (const [matricula, entry] of attempts) {
    const sigueBloqueada = entry.lockedUntil && ahora < entry.lockedUntil;
    if (!sigueBloqueada && ahora - entry.lastFailureAt > PURGA_INACTIVIDAD_MS) {
      attempts.delete(matricula);
    }
  }
}, PURGA_INTERVALO_MS);
// No debe mantener vivo el proceso solo por este timer de limpieza.
purgaTimer.unref?.();

export function isLocked(matricula) {
  const entry = attempts.get(matricula);
  if (!entry || !entry.lockedUntil) return false;
  if (Date.now() >= entry.lockedUntil) return false;
  return true;
}

export function lockedRemainingMs(matricula) {
  const entry = attempts.get(matricula);
  if (!entry || !entry.lockedUntil) return 0;
  return Math.max(0, entry.lockedUntil - Date.now());
}

export function recordFailure(matricula) {
  const entry = attempts.get(matricula) ?? { failCount: 0, lockedUntil: 0, lastFailureAt: 0 };
  entry.failCount += 1;
  entry.lastFailureAt = Date.now();
  if (entry.failCount >= MAX_FAILS_BEFORE_LOCK) {
    const extraFails = entry.failCount - MAX_FAILS_BEFORE_LOCK;
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** extraFails, MAX_LOCK_MS);
    entry.lockedUntil = Date.now() + lockMs;
  }
  attempts.set(matricula, entry);
}

export function recordSuccess(matricula) {
  attempts.delete(matricula);
}
