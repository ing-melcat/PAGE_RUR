/**
 * Vocabulario PÚBLICO de la telemetría del espectador.
 *
 * Aquí solo vive lo que puede verse desde la página pública: el nombre del
 * canal, el decodificador y las etiquetas de pantalla. El mapeo desde el
 * protocolo interno de control (ArmFront, ccw, los floats del joystick) se
 * queda deliberadamente en ControllerApp.jsx: si estuviera en este módulo
 * acabaría también en el chunk del espectador, que es justo lo que se quiere
 * evitar. SpectatorApp y ControllerApp se cargan como chunks separados
 * (React.lazy en src/App.tsx), así que la separación se sostiene.
 */

export const TOPIC_TELEMETRIA = 'telemetria';

// El operador reenvía el estado completo cada 100 ms. Si dejan de llegar
// paquetes es que soltó los controles o se desconectó; sin este corte los
// últimos valores se quedarían congelados en pantalla como si siguiera
// conduciendo.
export const INACTIVIDAD_MS = 2000;

// Los niveles van de 0 a 10, que es tanto el numero de segmentos de la barra
// como el porcentaje ya dividido entre diez.
export const NIVEL_MAX = 10;

// Sin `ruedas`: su panel de botones lleva display:none en ControllerApp desde
// antes de esta pantalla, así que esa casilla no podía encenderse nunca. Las
// ruedas se manejan con el joystick, y eso ya se ve en AVANCE y GIRO.
export const ACTUADORES = [
  { clave: 'brazo_delantero', abrev: 'BRZ-D' },
  { clave: 'brazo_trasero', abrev: 'BRZ-T' },
  { clave: 'tambor_delantero', abrev: 'TMB-D' },
  { clave: 'tambor_trasero', abrev: 'TMB-T' },
];

// Texto que se muestra bajo el grupo de actuadores cuando uno está activo.
export const ETIQUETAS_ACCION = {
  subiendo: 'SUBIENDO',
  bajando: 'BAJANDO',
  girando_horario: 'GIRANDO ⟳',
  girando_antihorario: 'GIRANDO ⟲',
  avanzando: 'AVANZANDO',
  retrocediendo: 'RETROCEDIENDO',
  izquierda: 'IZQUIERDA',
  derecha: 'DERECHA',
};

export const ETIQUETAS_AVANCE = { adelante: 'ADELANTE', atras: 'ATRÁS' };
export const ETIQUETAS_GIRO = { izquierda: 'IZQUIERDA', derecha: 'DERECHA' };

export const TELEMETRIA_VACIA = { avance: null, giro: null, actuadores: {}, robot: false };

/**
 * Decodifica un paquete de telemetría. Devuelve null si el paquete no es
 * telemetría válida, para que quien llame simplemente lo ignore.
 */
export function decodificarTelemetria(payload) {
  try {
    const datos = JSON.parse(new TextDecoder().decode(payload));
    if (!datos || datos.v !== 1) return null;
    return {
      avance: datos.avance ?? null,
      giro: datos.giro ?? null,
      actuadores: datos.actuadores ?? {},
      // Si no hay robot escuchando, lo que se pinta son órdenes que no está
      // recibiendo nadie. El espectador tiene que poder distinguirlo.
      robot: Boolean(datos.robot),
    };
  } catch {
    return null;
  }
}
