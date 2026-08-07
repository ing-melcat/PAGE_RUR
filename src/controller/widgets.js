/**
 * Catálogo de widgets del espectador.
 *
 * Agregar uno nuevo es añadir una entrada aquí y su caso en BarraTelemetria:
 * el menú, el guardado y el orden salen solos de esta lista.
 *
 * `fuente` dice de dónde salen sus datos, y sirve para avisar en el menú
 * cuando algo todavía no está disponible:
 *   'operador' — del paquete de telemetría que publica el controlador
 *   'enlace'   — de las estadísticas de la propia conexión de LiveKit
 *   'robot'    — pendiente: necesita que el robot publique sus sensores
 */

export const WIDGETS = [
  { id: 'avance', label: 'Avance', fuente: 'operador' },
  { id: 'giro', label: 'Giro', fuente: 'operador' },
  { id: 'actuadores', label: 'Actuadores', fuente: 'operador' },
  { id: 'calidad', label: 'Calidad de enlace', fuente: 'enlace' },
  { id: 'bitrate', label: 'Bitrate', fuente: 'enlace' },
  { id: 'video', label: 'Resolución y FPS', fuente: 'enlace' },
  { id: 'perdida', label: 'Pérdida y jitter', fuente: 'enlace' },
  { id: 'audiencia', label: 'Espectadores', fuente: 'enlace' },
];

// Lo que ve alguien que entra por primera vez: los mandos del operador, que es
// de lo que trata la transmisión. Lo demás se enciende desde el menú.
export const WIDGETS_POR_DEFECTO = ['avance', 'giro', 'actuadores'];

const CLAVE = 'rur.espectador.widgets';

/**
 * El espectador público no tiene cuenta, así que su tablero solo puede vivir en
 * el navegador. Para el operador —que sí tiene sesión— esto tendría que ir a la
 * base de datos junto a control_mappings, siguiendo la convención que ya está
 * escrita en db/init/01-schema.sql: las preferencias son del usuario, no del
 * dispositivo. Eso es trabajo aparte y aún no existe.
 */
export function cargarWidgets() {
  try {
    const guardado = JSON.parse(window.localStorage.getItem(CLAVE));
    if (!Array.isArray(guardado)) return WIDGETS_POR_DEFECTO;
    // Se filtra contra el catálogo para que un id viejo, de un widget que ya no
    // existe, no deje el tablero en un estado imposible de arreglar.
    const validos = guardado.filter((id) => WIDGETS.some((w) => w.id === id));
    return validos.length > 0 ? validos : WIDGETS_POR_DEFECTO;
  } catch {
    // Modo incógnito o almacenamiento bloqueado: se sigue sin guardar.
    return WIDGETS_POR_DEFECTO;
  }
}

export function guardarWidgets(ids) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(ids));
  } catch {
    // Que no se pueda guardar no debe romper la vista.
  }
}
