import DOMPurify from 'dompurify';

/**
 * El editor de publicaciones es HTML crudo escrito a mano a propósito (el
 * propio formulario dice "Escribe HTML aquí..."), para que redactor/admin
 * tengan control total de layout por publicación. `content` se guardaba y se
 * mostraba tal cual, sin ningún filtro, en dos sitios: la vista previa del
 * panel y la página pública que ve cualquier visitante.
 *
 * El riesgo real no es solo "alguien ensucia una publicación": la cookie de
 * sesión es httpOnly, pero la cookie CSRF se lee por diseño desde JavaScript
 * (doble-submit, ver src/lib/apiClient.ts). Un <script> inyectado por un
 * redactor puede leer esa cookie y fabricar peticiones autenticadas válidas
 * como quien sea que abra la publicación después -- incluido un admin
 * revisándola. Es una vía real de escalar de redactor a admin, no solo
 * desfiguración.
 *
 * La config por defecto de DOMPurify es la elegida a propósito: bloquea
 * <script>, atributos on* (onerror, onclick...) y URLs javascript:, pero deja
 * pasar el HTML/CSS normal -- incluido el atributo style en línea que ya usan
 * los redactores. No hace falta una lista blanca a mano: la que trae DOMPurify
 * ya cubre el caso de uso real sin que nadie note el cambio en su flujo.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html ?? '');
}
