import { randomInt } from 'node:crypto';

/**
 * Qué se acepta como contraseña.
 *
 * Hasta ahora: cualquier cosa. Un administrador podía crear una cuenta con la
 * contraseña "1" y nada lo impedía, ni en el panel ni en el servidor.
 *
 * La regla es larga y sin jeroglíficos, a propósito. Exigir mayúscula, número
 * y símbolo produce en la práctica peores contraseñas: la gente escribe la
 * misma de siempre con un "1!" al final y la apunta en un papel. La longitud,
 * en cambio, sí multiplica el trabajo de quien la quiera adivinar.
 *
 * Lo que sí se prohíbe es que contenga datos de la propia persona: la
 * matrícula está en su credencial y su nombre está en la web, así que son lo
 * primero que probaría cualquiera que la conozca.
 */

export const LARGO_MINIMO = 10;

// bcrypt solo mira los primeros 72 BYTES y descarta el resto en silencio. Sin
// este tope, dos contraseñas distintas que compartan los primeros 72 bytes
// serían la misma para el sistema, y quien puso una de 200 caracteres creería
// tener una seguridad que no tiene. Se rechaza en vez de recortar sin avisar.
export const LARGO_MAXIMO_BYTES = 72;

// Sin acentos y en minúsculas, para que "Melcat" no cuele como contraseña de
// alguien que se llama "Melcat".
function normalizar(texto) {
  return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * @param nueva la contraseña propuesta
 * @param dueño { matricula, nombre, alias } — de quién es la cuenta
 * @returns { ok: true } | { ok: false, error: string }
 */
export function validarPassword(nueva, dueño = {}) {
  if (typeof nueva !== 'string' || nueva.trim() === '') {
    return { ok: false, error: 'Escribe una contraseña.' };
  }
  // Sin recortar espacios: un espacio al principio o al final es parte de la
  // contraseña y quitarlo cambiaría lo que la persona cree haber puesto.
  if (nueva.length < LARGO_MINIMO) {
    return { ok: false, error: `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.` };
  }
  if (Buffer.byteLength(nueva, 'utf8') > LARGO_MAXIMO_BYTES) {
    return { ok: false, error: 'La contraseña es demasiado larga: máximo 72 caracteres (menos si usas acentos o emojis).' };
  }

  const llana = normalizar(nueva);

  const matricula = normalizar(dueño.matricula ?? '');
  if (matricula && llana.includes(matricula)) {
    return { ok: false, error: 'La contraseña no puede contener tu matrícula.' };
  }

  // Por palabras y no por el nombre entero: nadie usa "Luis Antonio Simental
  // Ochoa" de contraseña, pero "Simental2024" sí. Se ignoran las partículas
  // cortas ("de", "la"), que aparecerían en cualquier texto.
  const palabras = [dueño.nombre, dueño.alias]
    .filter(Boolean)
    .flatMap((t) => normalizar(t).split(/[^a-z0-9]+/))
    .filter((p) => p.length >= 4);
  if (palabras.some((p) => llana.includes(p))) {
    return { ok: false, error: 'La contraseña no puede contener tu nombre ni tu alias.' };
  }

  return { ok: true };
}

/**
 * Una contraseña temporal generada por el servidor, para cuando un
 * administrador reinicia la de otra persona.
 *
 * Se genera aquí y no la escribe el admin de su cabeza: una tecleada a mano
 * acaba siendo "robotica123" para todo el mundo, y encima se reutiliza. Se
 * dicta en voz alta o por chat, así que se evitan los caracteres que se
 * confunden al leerlos (l/1/I, O/0) en vez de fiarlo a que se entienda bien.
 */
const ALFABETO = 'abcdefghijkmnpqrstuvwxyz23456789ACDEFGHJKLMNPQRSTUVWXYZ';

// randomInt de node:crypto, no Math.random: esta cadena es, durante unas
// horas, la llave entera de una cuenta.
export function generarPasswordTemporal(largo = 14) {
  let salida = '';
  for (let i = 0; i < largo; i += 1) salida += ALFABETO[randomInt(ALFABETO.length)];
  return salida;
}
