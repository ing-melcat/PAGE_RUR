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

/**
 * Widgets que esperan a que el robot publique sus sensores.
 *
 * Están aquí y no en WIDGETS a propósito: mientras nadie publique el topic
 * `telemetria_robot`, aparecerían en el menú del espectador prometiendo datos
 * que jamás llegarían. El contrato de lo que debe mandar el robot está en
 * docs/TELEMETRIA_ROBOT.md, pendiente del área de hardware.
 *
 * Para activarlos cuando lleguen los datos: mover la entrada a WIDGETS, añadir
 * su etiqueta en telemetria.widgetLabel (src/lib/locales/es.ts y en.ts) y su
 * caso en BarraTelemetria. Nada más — la marca de "sin datos" del menú ya
 * contempla la fuente 'robot'.
 */
export const WIDGETS_PENDIENTES = [
  { id: 'bateria', fuente: 'robot' },
  { id: 'velocidadReal', fuente: 'robot' },
  { id: 'inclinacion', fuente: 'robot' },
  { id: 'distancia', fuente: 'robot' },
  { id: 'temperatura', fuente: 'robot' },
];

// Lo que ve alguien que entra por primera vez: los mandos del operador, que es
// de lo que trata la transmisión. Lo demás se enciende desde el menú.
export const WIDGETS_POR_DEFECTO = ['avance', 'giro', 'actuadores'];

// El operador arranca además con la audiencia encendida: antes la tenía fija
// en su tarjeta de ESTADO, que se retiró al quedar toda su información
// duplicada en la barra. Sigue pudiendo apagarla desde el menú como cualquier
// otro widget.
export const WIDGETS_OPERADOR = [...WIDGETS_POR_DEFECTO, 'audiencia'];
