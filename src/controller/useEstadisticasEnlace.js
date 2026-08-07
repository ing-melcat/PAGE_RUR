import { useEffect, useRef, useState } from 'react';
import { ConnectionQuality, RoomEvent } from 'livekit-client';

/**
 * Estadísticas de la propia conexión de LiveKit, para los widgets de enlace.
 *
 * No dependen del robot: salen del video que ya se está recibiendo, así que
 * funcionan desde el primer día, sin sensores ni cambios en el receptor.
 *
 * Ojo con lo que NO hay: un espectador solo recibe, y el tiempo de ida y vuelta
 * (roundTripTime) vive en las estadísticas de quien publica. Lo más parecido
 * que tenemos aquí es el retardo del búfer.
 */

const PERIODO_MS = 1000;

const ETIQUETA_CALIDAD = {
  [ConnectionQuality.Excellent]: 'Excelente',
  [ConnectionQuality.Good]: 'Buena',
  [ConnectionQuality.Poor]: 'Pobre',
  [ConnectionQuality.Lost]: 'Perdida',
};

function pistaDeVideo(room) {
  for (const participante of room.remoteParticipants.values()) {
    for (const publicacion of participante.trackPublications.values()) {
      const pista = publicacion.track;
      if (pista?.kind === 'video' && typeof pista.getReceiverStats === 'function') {
        return { pista, participante };
      }
    }
  }
  return null;
}

export function useEstadisticasEnlace(room, activo) {
  const [datos, setDatos] = useState(null);
  // La muestra anterior, para sacar bitrate y fps por diferencia: las
  // estadísticas son acumuladas desde el inicio, no por segundo.
  const previaRef = useRef(null);

  useEffect(() => {
    if (!room || !activo) return;

    let cancelado = false;

    const medir = async () => {
      const encontrada = pistaDeVideo(room);
      if (!encontrada) {
        // Sin video no hay estadísticas de recepción, pero la audiencia y la
        // calidad del enlace sí se pueden reportar igual.
        previaRef.current = null;
        if (!cancelado) {
          setDatos({
            hayVideo: false,
            espectadores: room.remoteParticipants.size,
            calidad: ETIQUETA_CALIDAD[room.localParticipant?.connectionQuality] ?? '—',
          });
        }
        return;
      }

      const { pista, participante } = encontrada;
      let s;
      try {
        s = await pista.getReceiverStats();
      } catch {
        return;
      }
      if (!s || cancelado) return;

      const previa = previaRef.current;
      let bitrateKbps = null;
      let fps = null;

      if (previa && s.timestamp > previa.timestamp) {
        const segundos = (s.timestamp - previa.timestamp) / 1000;
        if (segundos > 0) {
          bitrateKbps = Math.round((((s.bytesReceived ?? 0) - (previa.bytesReceived ?? 0)) * 8) / segundos / 1000);
          fps = Math.round(((s.framesDecoded ?? 0) - (previa.framesDecoded ?? 0)) / segundos);
        }
      }
      previaRef.current = s;

      setDatos({
        hayVideo: true,
        espectadores: room.remoteParticipants.size,
        calidad: ETIQUETA_CALIDAD[participante.connectionQuality] ?? '—',
        bitrateKbps,
        fps,
        ancho: s.frameWidth ?? null,
        alto: s.frameHeight ?? null,
        perdidos: s.packetsLost ?? 0,
        recibidos: s.packetsReceived ?? 0,
        jitterMs: s.jitter != null ? Math.round(s.jitter * 1000) : null,
        bufferMs: s.jitterBufferDelay != null ? Math.round(s.jitterBufferDelay * 1000) : null,
        framesCaidos: s.framesDropped ?? 0,
      });
    };

    medir();
    const id = setInterval(medir, PERIODO_MS);

    // La primera muestra tras suscribirse a un track nuevo no tiene con qué
    // compararse; se descarta la previa para no calcular un bitrate absurdo.
    const alSuscribir = () => { previaRef.current = null; };
    room.on(RoomEvent.TrackSubscribed, alSuscribir);

    return () => {
      cancelado = true;
      clearInterval(id);
      room.off(RoomEvent.TrackSubscribed, alSuscribir);
    };
  }, [room, activo]);

  return datos;
}
