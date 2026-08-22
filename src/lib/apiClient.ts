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

// Sin esto, un servicio backend colgado dejaba cualquier fetch esperando
// indefinidamente: el usuario se quedaba mirando un spinner sin límite, sin
// ningún error que mostrar.
const DEFAULT_TIMEOUT_MS = 15_000;

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = getCookie('rur_csrf');
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  // Si el caller ya trae su propio AbortSignal, se respeta tal cual y no se
  // le superpone otro.
  if (options.signal) {
    return fetch(url, { ...options, credentials: 'include', headers });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, credentials: 'include', headers, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiJson<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(url, options);
  return res.json();
}

// fetch() no expone progreso de subida en ningún navegador de forma
// consistente (streaming del cuerpo de la petición es soporte parcial y
// reciente); XMLHttpRequest sí, con xhr.upload.onprogress, desde siempre.
// Es la única razón para no usar apiFetch aquí -- el manejo de CSRF y cookie
// de sesión es el mismo, solo que replicado a mano porque XHR no comparte
// código con fetch.
export function apiUpload(
  url: string,
  formData: FormData,
  options: { onProgress?: (fraccion: number) => void; signal?: AbortSignal } = {}
): Promise<{ status: number; contentType: string | null; json: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true; // equivalente a credentials:'include' de apiFetch

    const csrfToken = getCookie('rur_csrf');
    if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);

    // Sin tope propio, y NO los 15s de DEFAULT_TIMEOUT_MS de arriba: ese
    // valor está pensado para una respuesta JSON pequeña, no para el tiempo
    // que tarda en viajar un archivo entero. 10 minutos es margen de sobra
    // para una subida lenta pero que sí avanza; una que de verdad se cuelga
    // sigue teniendo tope, en vez de esperar para siempre.
    xhr.timeout = 10 * 60 * 1000;

    if (options.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) options.onProgress!(e.loaded / e.total);
      };
    }

    xhr.onload = () => {
      let json = null;
      try { json = JSON.parse(xhr.responseText); } catch { /* respuesta no-JSON: se resuelve con json:null, el caller ya sabe leer eso */ }
      resolve({ status: xhr.status, contentType: xhr.getResponseHeader('content-type'), json });
    };
    xhr.onerror = () => reject(new Error('Error de red subiendo el archivo.'));
    xhr.ontimeout = () => reject(new Error('La subida tardó demasiado y se canceló.'));
    xhr.onabort = () => reject(new Error('Subida cancelada.'));

    if (options.signal) {
      if (options.signal.aborted) { xhr.abort(); return; }
      options.signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.send(formData);
  });
}

export function hasSessionCookieHint(): boolean {
  // rur_csrf no es httpOnly a propósito (ver services/shared/csrf.js) --
  // sirve como pista barata de "probablemente hay sesión" para no hacer un
  // fetch a /api/me en cada carga si el usuario nunca inició sesión. No es
  // la fuente de verdad: eso lo decide siempre el backend.
  return getCookie('rur_csrf') !== null;
}
