import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { HudEspectador } from './components/HudEspectador';
import { LecturaSuelta } from './components/LecturaSuelta';
import './Overlay.css';

/**
 * Capa de datos para OBS. Ruta: /overlay/:robotId
 *
 * No es una página que nadie visite: es una fuente de navegador (Browser
 * Source) que se pega en OBS y se compone sobre el vídeo. Por eso no lleva
 * cabecera, ni botón de salir, ni fondo — solo los datos y transparencia
 * alrededor.
 *
 * Todo se controla por la URL, para que montar una escena no obligue a tocar
 * código:
 *
 *   /overlay/rassor-1
 *   /overlay/rassor-1?layout=suelto&widgets=avance
 *   /overlay/rassor-1?widgets=avance,giro,actuadores&escala=1.5&align=abajo
 *
 * | Parámetro | Valores | Por defecto |
 * |---|---|---|
 * | `layout`  | `franja` (la barra entera) · `suelto` (un dato aislado) | `franja` |
 * | `widgets` | lista separada por comas | todos los de la franja |
 * | `escala`  | multiplicador de tamaño, para 1080p o 4K | `1` |
 * | `align`   | `abajo` · `arriba` · `centro` | `abajo` |
 *
 * DOS DECISIONES QUE IMPORTAN:
 *
 * 1. **No se suscribe al vídeo** (`autoSubscribe: false`). OBS ya tiene la
 *    imagen por su propia fuente; que cada capa se bajara el vídeo otra vez
 *    multiplicaría el ancho de banda por el número de capas para no pintarlo.
 * 2. **Pide el token con `proposito: 'overlay'`**, que lo firma con otra
 *    identidad para no contarse como espectador. Cuatro capas en OBS no son
 *    cuatro personas viendo.
 */
export default function OverlayApp() {
  const { robotId } = useParams();
  const [params] = useSearchParams();
  const [room, setRoom] = useState(null);
  const [robotName, setRobotName] = useState('');
  const [error, setError] = useState(null);
  const roomRef = useRef(null);

  const layout = params.get('layout') || 'franja';
  const escala = Number(params.get('escala')) || 1;
  const align = params.get('align') || 'abajo';
  // ?demo=1 alimenta los instrumentos de sensores con datos simulados que
  // respetan el contrato (docs/TELEMETRIA_ROBOT.md). Sirve para montar y
  // ensayar una escena de OBS sin robot delante.
  const simular = params.get('demo') === '1';
  // Fondo de PREVISUALIZACIÓN. En OBS la página va transparente, que es su
  // razón de ser; pero abierta en una pestaña normal el navegador pinta el
  // hueco de blanco y el texto hueso se vuelve ilegible. Con ?fondo=oscuro se
  // simula el vídeo para poder revisar la capa fuera de OBS.
  //   oscuro  — navy del sitio, como un plano nocturno
  //   claro   — gris medio, para comprobar el peor caso de legibilidad
  //   terreno — regolito con piedras y cielo claro: el fondo más parecido a
  //             lo que verá la cámara, y el que de verdad delata si el texto
  //             se lee o se pierde
  //   damero  — el tablero de los editores: deja ver qué es transparente
  const fondo = params.get('fondo');
  // El velo oscuro tras las cifras va PUESTO por defecto: sin él, sobre un
  // cielo claro o una pared iluminada el texto desaparece. ?velo=0 lo quita
  // para quien quiera transparencia absoluta y prefiera resolver el contraste
  // desde la propia escena de OBS.
  const sinVelo = params.get('velo') === '0';
  const widgets = params.get('widgets')
    ? params.get('widgets').split(',').map((w) => w.trim()).filter(Boolean)
    : null;

  useEffect(() => {
    let cancelado = false;

    const conectar = async () => {
      try {
        const res = await fetch('/api/livekit/public-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ robotId, proposito: 'overlay' }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success || !data.token) {
          if (!cancelado) setError(data?.message || 'Sin transmisión');
          return;
        }
        if (cancelado) return;

        setRobotName(data.robotName || robotId);

        const { Room, RoomEvent, setLogLevel } = await import('livekit-client');
        setLogLevel('warn');
        const instancia = new Room();
        // Solo datos: ver la nota 1 de la cabecera.
        await instancia.connect(data.livekitUrl, data.token, { autoSubscribe: false });

        if (cancelado) {
          instancia.disconnect();
          return;
        }

        instancia.on(RoomEvent.Disconnected, () => {
          setRoom(null);
          roomRef.current = null;
        });

        roomRef.current = instancia;
        setRoom(instancia);
      } catch (err) {
        console.error('[overlay] error al conectar:', err);
        if (!cancelado) setError('Error de conexión');
      }
    };

    conectar();

    return () => {
      cancelado = true;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [robotId]);

  // Un overlay que falla debe ser INVISIBLE, no un cartel de error: lo que
  // esté detrás en OBS sigue emitiéndose, y un mensaje rojo en pantalla
  // saldría en directo. El motivo queda en la consola del Browser Source.
  if (error) {
    console.warn(`[overlay] ${error}`);
    return null;
  }

  return (
    <div
      className={`overlay overlay--${align}${fondo ? ` overlay--fondo-${fondo}` : ''}${sinVelo ? ' overlay--sin-velo' : ''}`}
      style={{ '--overlay-escala': escala }}
    >
      {room && (
        layout === 'suelto'
          ? <LecturaSuelta room={room} widgets={widgets} />
          : <HudEspectador room={room} titulo={robotName} widgets={widgets} simular={simular} />
      )}
    </div>
  );
}
