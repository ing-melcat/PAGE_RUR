import { useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import {
  INACTIVIDAD_MS,
  TELEMETRIA_VACIA,
  TOPIC_TELEMETRIA,
  TOPIC_MISION,
  MISION_VACIA,
  decodificarTelemetria,
  decodificarMision,
} from './telemetria';

/**
 * Estado de telemetría del robot, venga de donde venga.
 *
 * Dos fuentes posibles, nunca las dos a la vez:
 *
 *  - **local** (`fuenteLocal`): el operador genera él mismo esos valores, así
 *    que se los sondea directamente en vez de esperar a que le vuelvan por la
 *    red dando la vuelta entera.
 *  - **remota** (`room`): el canal de datos de LiveKit, que es lo que ve el
 *    espectador.
 *
 * El estado vive dentro del hook y no en quien lo usa: son diez
 * actualizaciones por segundo, y subirlas a un componente padre re-renderiza
 * media consola por cada paquete.
 *
 * `enVivo` se apaga solo tras INACTIVIDAD_MS sin recibir nada. Sin ese corte,
 * los últimos valores se quedarían clavados en pantalla como si el robot
 * siguiera conduciendo después de que el operador soltara los mandos.
 *
 * Extraído de BarraTelemetria para que el HUD del espectador pueda reutilizarlo
 * tal cual, sin duplicar la decodificación ni el criterio de inactividad.
 */
export function useTelemetria(room, fuenteLocal) {
  const [telemetria, setTelemetria] = useState(TELEMETRIA_VACIA);
  const [enVivo, setEnVivo] = useState(false);
  const ultimoRef = useRef(0);

  useEffect(() => {
    if (!fuenteLocal) return;
    const id = setInterval(() => {
      const datos = fuenteLocal();
      if (!datos) return;
      ultimoRef.current = Date.now();
      setEnVivo(true);
      setTelemetria(datos);
    }, 100);
    return () => clearInterval(id);
  }, [fuenteLocal]);

  useEffect(() => {
    if (fuenteLocal || !room) return;

    const alRecibir = (payload, _participante, _kind, topic) => {
      if (topic !== TOPIC_TELEMETRIA) return;
      const datos = decodificarTelemetria(payload);
      if (!datos) return;
      ultimoRef.current = Date.now();
      setEnVivo(true);
      setTelemetria(datos);
    };

    room.on(RoomEvent.DataReceived, alRecibir);
    return () => room.off(RoomEvent.DataReceived, alRecibir);
  }, [room, fuenteLocal]);

  useEffect(() => {
    const id = setInterval(() => {
      if (ultimoRef.current && Date.now() - ultimoRef.current > INACTIVIDAD_MS) {
        setEnVivo(false);
        setTelemetria(TELEMETRIA_VACIA);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  return { telemetria, enVivo };
}

/**
 * `true` si el usuario pidió al sistema que se reduzca el movimiento. Los
 * indicadores lo usan para desactivar sus transiciones en vez de ignorar la
 * preferencia.
 */
export function useSinMovimiento() {
  const [sinMovimiento, setSinMovimiento] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => setSinMovimiento(media.matches);
    aplicar();
    media.addEventListener('change', aplicar);
    return () => media.removeEventListener('change', aplicar);
  }, []);

  return sinMovimiento;
}

export function useMision(room, fuenteLocal) {
  const [mision, setMision] = useState(MISION_VACIA);

  useEffect(() => {
    if (!fuenteLocal) return;
    const id = setInterval(() => {
      const datos = fuenteLocal();
      if (datos) setMision(datos);
    }, 1000); // 1 sec poll for local mission
    return () => clearInterval(id);
  }, [fuenteLocal]);

  useEffect(() => {
    if (fuenteLocal || !room) return;

    const alRecibir = (payload, _participante, _kind, topic) => {
      if (topic !== TOPIC_MISION) return;
      const datos = decodificarMision(payload);
      if (datos) setMision(datos);
    };

    room.on(RoomEvent.DataReceived, alRecibir);
    return () => room.off(RoomEvent.DataReceived, alRecibir);
  }, [room, fuenteLocal]);

  return mision;
}
