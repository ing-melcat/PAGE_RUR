// Cliente fetch compartido para todas las llamadas a la API.
//
// Antes: el JWT vivía en localStorage y cada call site armaba a mano un
// header "Authorization: Bearer <token>" -- legible por cualquier script
// inyectado vía XSS. Ahora: el backend fija una cookie httpOnly de sesión
// que el navegador adjunta solo (credentials:'include'), y un token CSRF de
// doble-submit (cookie legible + header) protege las peticiones que
// modifican estado.
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = getCookie('rur_csrf');
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  return fetch(url, { ...options, credentials: 'include', headers });
}

export async function apiJson<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(url, options);
  return res.json();
}

export function hasSessionCookieHint(): boolean {
  // rur_csrf no es httpOnly a propósito (ver services/shared/csrf.js) --
  // sirve como pista barata de "probablemente hay sesión" para no hacer un
  // fetch a /api/me en cada carga si el usuario nunca inició sesión. No es
  // la fuente de verdad: eso lo decide siempre el backend.
  return getCookie('rur_csrf') !== null;
}
