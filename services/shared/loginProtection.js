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

// Las dos defensas contra probar contraseñas a lo bruto —el límite por red y
// el bloqueo progresivo por cuenta— quedan APAGADAS fuera de producción.
//
// No es un descuido: en dev se entra y se sale de las mismas cuentas decenas
// de veces seguidas probando el alta, la contraseña provisional y la
// vinculación del autenticador, y a los cinco fallos la cuenta se bloqueaba
// justo en mitad de la prueba. Una espera de 30 segundos que se duplica sola
// no protege nada en una IP de Tailscale sin exponer, y sí impide probar el
// flujo que hay que probar.
//
// Se mira NODE_ENV aquí mismo en vez de importar IS_PRODUCTION de auth.js
// para no atar dos módulos compartidos por una sola comparación. El valor lo
// pone el compose: 'production' en el stack real, 'development' en rur-dev.
const EN_PRODUCCION = process.env.NODE_ENV === 'production';

export const loginIpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !EN_PRODUCCION,
  handler: (req, res) => res.status(429).json({
    success: false,
    message: 'Demasiados intentos desde esta red. Espera unos minutos.',
  }),
});

// Cambiar la contraseña exige acertar la actual, así que esa ruta es otro sitio
// donde se puede adivinar a base de intentos — con la ventaja para el atacante
// de que ahí no hay bloqueo por cuenta que lo delate. Límite propio y más
// estrecho que el del login: nadie cambia su contraseña diez veces en un rato.
//
// No se reutiliza el bloqueo por matrícula a propósito: dejaría que quien tiene
// una sesión robada cerrara al dueño fuera del login fallando aposta.
export const cambioPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    success: false,
    message: 'Demasiados intentos de cambio de contraseña. Espera unos minutos.',
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
  // Fuera de producción no se bloquea nunca (ver la nota de arriba). El
  // corte se hace aquí y no en recordFailure para que el conteo siga
  // ocurriendo igual: así el registro de actividad sigue mostrando los
  // fallos, que es información útil también en dev.
  if (!EN_PRODUCCION) return false;
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
