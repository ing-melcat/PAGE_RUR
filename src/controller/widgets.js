/**
 * Catálogo de widgets del espectador.
 *
 * Agregar uno nuevo es añadir una entrada aquí, su etiqueta en
 * telemetria.widgetLabel (src/lib/locales/es.ts y en.ts) y su caso en
 * BarraTelemetria: el menú y el orden salen solos de esta lista.
 *
 * `fuente` dice de dónde salen sus datos, y sirve para avisar en el menú
 * cuando algo todavía no está disponible:
 *   'operador' — del paquete de telemetría que publica el controlador
 *   'enlace'   — de las estadísticas de la propia conexión de LiveKit
 *   'robot'    — pendiente: necesita que el robot publique sus sensores
 */

export const WIDGETS = [
  { id: 'avance', fuente: 'operador' },
  { id: 'giro', fuente: 'operador' },
  { id: 'actuadores', fuente: 'operador' },
  { id: 'calidad', fuente: 'enlace' },
  { id: 'bitrate', fuente: 'enlace' },
  { id: 'video', fuente: 'enlace' },
  { id: 'perdida', fuente: 'enlace' },
  { id: 'audiencia', fuente: 'enlace' },
];

// Lo que ve alguien que entra por primera vez: los mandos del operador, que es
// de lo que trata la transmisión. Lo demás se enciende desde el menú.
export const WIDGETS_POR_DEFECTO = ['avance', 'giro', 'actuadores'];
