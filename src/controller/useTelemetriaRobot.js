import { useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import {
  INACTIVIDAD_MS,
  TOPIC_TELEMETRIA_ROBOT,
  decodificarTelemetriaRobot,
} from './telemetria';

/**
 * Sensores del robot: lo que la máquina MIDE, frente a lo que el operador
 * ordena (eso es useTelemetria). Contrato en docs/TELEMETRIA_ROBOT.md.
 *
 * Mientras el robot no publique nada, este hook devuelve `null` y los widgets
 * que dependen de él se apagan solos. No inventa ceros: un cero afirma que el
 * robot está parado y nivelado, que es una afirmación muy distinta de "no lo
 * sé".
 *
 * @param simular  genera datos de mentira que respetan el contrato, para ver
 *                 el comportamiento de los indicadores sin hardware. Se activa
 *                 con ?demo=1 en la URL. Ver la nota de MODO SIMULACIÓN abajo.
 */
export function useTelemetriaRobot(room, simular = false) {
  const [datos, setDatos] = useState(null);
  const ultimoRef = useRef(0);

  // --- fuente real ---
  useEffect(() => {
    if (simular || !room) return;

    const alRecibir = (payload, _participante, _kind, topic) => {
      if (topic !== TOPIC_TELEMETRIA_ROBOT) return;
      const paquete = decodificarTelemetriaRobot(payload);
      if (!paquete) return;
      ultimoRef.current = Date.now();
      setDatos(paquete);
    };

    room.on(RoomEvent.DataReceived, alRecibir);
    return () => room.off(RoomEvent.DataReceived, alRecibir);
  }, [room, simular]);

  // --- corte por inactividad ---
  useEffect(() => {
    if (simular) return;
    const id = setInterval(() => {
      if (ultimoRef.current && Date.now() - ultimoRef.current > INACTIVIDAD_MS) {
        setDatos(null);
      }
    }, 500);
    return () => clearInterval(id);
  }, [simular]);

  // ---------------------------------------------------------------------
  // MODO SIMULACIÓN
  //
  // Publica a 10 Hz, igual que pide el contrato, y con la MISMA forma de
  // paquete —incluidas las unidades y los signos— para que sirva de prueba
  // real del formato antes de que exista el hardware. Si al conectar el robot
  // de verdad algo se ve al revés, el fallo está en el firmware y no en la
  // interfaz, porque la interfaz ya se validó contra este.
  //
  // La batería baja despacio y no se recarga: así se puede ver cómo cambia el
  // indicador al cruzar los umbrales de aviso sin esperar una hora.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!simular) return;

    // Perfil de terreno: la mayor parte del tiempo llano, y de vez en cuando
    // una pendiente que entra y sale suavemente. `periodo` es cada cuánto
    // aparece una, y `amplitud` cuánto inclina.
    const pendiente = (t, periodo, amplitud) => {
      const fase = (t % periodo) / periodo;
      if (fase > 0.45) return 0;                       // llano
      return Math.sin((fase / 0.45) * Math.PI) * amplitud;
    };

    const arranque = Date.now();
    const id = setInterval(() => {
      const s = (Date.now() - arranque) / 1000;

      setDatos({
        t: Math.round(s * 1000),
        velocidad: {
          // m/s, positivo hacia delante (contrato §3).
          lineal: Number((Math.sin(s / 4) * 1.2).toFixed(2)),
          // rad/s, positivo girando a la izquierda.
          angular: Number((Math.sin(s / 6 + 1) * 0.8).toFixed(2)),
        },
        odometria: { distancia: Number((s * 0.35).toFixed(1)) },
        bateria: {
          porcentaje: Math.max(0, Math.round(92 - s / 6)),
          voltaje: Number((24.8 - s / 400).toFixed(1)),
          corriente: Number((2.5 + Math.sin(s / 3)).toFixed(1)),
        },
        // El terreno no es una onda: son tramos llanos y alguna pendiente que
        // se cruza y se deja atrás. La versión anterior oscilaba sin parar con
        // dos senoides, y el modelo 3D se pasaba la vida meciéndose — que es
        // justo lo que un HUD no debe hacer.
        imu: {
          pitch: Number(pendiente(s, 17, 11).toFixed(1)),
          roll: Number(pendiente(s + 40, 23, 7).toFixed(1)),
          rumbo: Number((((s * 3) % 360)).toFixed(1)),
        },
        temperatura: {
          motores: Number((38 + Math.sin(s / 10) * 6).toFixed(1)),
          controlador: Number((35 + Math.sin(s / 12) * 3).toFixed(1)),
        },
        estado: { nivel: 'ok', mensaje: '' },
      });
    }, 100);

    return () => clearInterval(id);
  }, [simular]);

  return datos;
}
