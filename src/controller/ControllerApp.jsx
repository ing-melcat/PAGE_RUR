import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import './Consola.css';
import { RotateCcw, RotateCw, Loader2 } from 'lucide-react';
import { Segment } from './Segment';
import { Cabezal } from './Cabezal';
import { VideoViewer } from './VideoViewer';
import { Login } from './Login';
import { apiFetch } from '../lib/apiClient';

import { ControlButton } from './components/ControlButton';
import { ControlGroup } from './components/ControlGroup';
import { Joystck } from './components/Joystck';
import { WIDGETS_OPERADOR } from './widgets';
import { BarraTelemetria } from './components/BarraTelemetria';
import { TOPIC_TELEMETRIA } from './telemetria';
import { useLanguage } from '../lib/i18n';

// three.js + @react-three/xr son pesados y solo hacen falta en modo VR, así
// que van en su propio chunk -- el modo manual (el único usable hoy) no
// paga ese peso.
const VRConsole = lazy(() => import('./VRConsole').then((m) => ({ default: m.VRConsole })));

const TOPIC = 'control';
const SERVER_URL = import.meta.env.VITE_LIVEKIT_URL || "wss://rur-livekit-server-8b010r3b.livekit.cloud";

// Se dispara en cuanto se evalúa este módulo (ControllerApp ya está
// lazy-loaded desde LoginApp, así que esto ocurre justo cuando el operador
// elige un robot), en paralelo con el fetch del token de LiveKit de más
// abajo -- antes el import() se lanzaba recién después de que volvía el
// fetch del token, encadenando dos operaciones independientes en vez de
// solaparlas.
const livekitClientPromise = import('livekit-client');

// ---------------------------------------------------------------------------
// Reparto de paquetes en la sala
//
// Los comandos de control se dirigen SOLO al robot. Antes se difundían a toda
// la sala, así que un espectador público podía leer por F12 el protocolo
// completo: el binario de 12 bytes, los nombres de componentes y las acciones.
// Las identidades las firma el servidor (services/robots/server.js), nunca el
// cliente, así que se puede filtrar por ellas con confianza:
//
//   operator-<matricula>       operador
//   viewer-<matricula>         usuario logueado sin rol de operador
//   public-viewer-<ts>-<rand>  espectador público
//   robot-*                    el robot (token propio, robot_receiver_prod.py)
//
// Se usa lista blanca y no lista negra a propósito: una identidad desconocida
// no recibe nada (falla cerrado). Con lista negra sí los recibiría.
// ---------------------------------------------------------------------------
const PREFIJO_ROBOT = 'robot-';
const PREFIJOS_ESPECTADOR = ['viewer-', 'public-viewer-'];

function identidadesDeRobots(room) {
  if (!room) return [];
  return Array.from(room.remoteParticipants.values())
    .map((p) => p.identity)
    .filter((identity) => identity?.startsWith(PREFIJO_ROBOT));
}

function contarEspectadores(room) {
  if (!room) return 0;
  return Array.from(room.remoteParticipants.values())
    .filter((p) => PREFIJOS_ESPECTADOR.some((prefijo) => p.identity?.startsWith(prefijo)))
    .length;
}

// ---------------------------------------------------------------------------
// Traducción a telemetría pública
//
// Es lo único que ve el espectador: nombres en español y un nivel de 0 a 10 en
// lugar de los floats crudos. Estas tablas se quedan aquí a propósito — si
// vivieran en src/controller/telemetria.js acabarían también en el chunk del
// espectador y volverían a filtrar el vocabulario interno.
// ---------------------------------------------------------------------------
const COMPONENTE_PUBLICO = {
  ArmFront: 'brazo_delantero',
  ArmBack: 'brazo_trasero',
  DrumFront: 'tambor_delantero',
  DrumBack: 'tambor_trasero',
  Wheel: 'ruedas',
};

const ACCION_PUBLICA = {
  up: 'subiendo',
  down: 'bajando',
  cw: 'girando_horario',
  ccw: 'girando_antihorario',
  forward: 'avanzando',
  backward: 'retrocediendo',
  left: 'izquierda',
  right: 'derecha',
};

// ---------------------------------------------------------------------------
// Mapeo personalizado de brazos/tambores (mando y teclado)
//
// El operador lo configura en RobotSelection (botón de ajustes), se guarda en
// su perfil como control_mappings y llega aquí por props. Antes de esto,
// ControllerApp ignoraba esa configuración por completo: el mando usaba
// índices de botón fijos en el código (y con nombres de componente que ni
// siquiera coincidían con lo que espera el robot), y el teclado no tenía
// ningún control de brazos/tambores en absoluto.
//
// Las 8 claves (`${Componente}${Accion}`) son las mismas que usa el modal de
// configuración -- no se inventan aquí.
// ---------------------------------------------------------------------------
const MAPEO_ACCIONES = [
  { clave: 'ArmFrontUp', component: 'ArmFront', action: 'Up' },
  { clave: 'ArmFrontDown', component: 'ArmFront', action: 'Down' },
  { clave: 'ArmBackUp', component: 'ArmBack', action: 'Up' },
  { clave: 'ArmBackDown', component: 'ArmBack', action: 'Down' },
  { clave: 'DrumFrontCw', component: 'DrumFront', action: 'Cw' },
  { clave: 'DrumFrontCcw', component: 'DrumFront', action: 'Ccw' },
  { clave: 'DrumBackCw', component: 'DrumBack', action: 'Cw' },
  { clave: 'DrumBackCcw', component: 'DrumBack', action: 'Ccw' },
];

// Mismos valores por defecto que RobotSelection.jsx: si el operador nunca
// abrió el modal de configuración, control_mappings llega vacío/nulo y se
// usan estos.
//
// En mando, los brazos ya NO son bindeables aquí: LT/RT (gatillos) quedan
// reservados por el sistema para subir/bajar el brazo de esa mano moviendo
// el propio stick (ver pollGamepad), así que solo quedan las 4 acciones de
// tambor, repartidas en los botones que el esquema de gatillos deja libres.
// Teclado no tiene gatillos analógicos, así que conserva sus 8 teclas tal
// cual.
const MAPEO_GAMEPAD_DEFECTO = {
  DrumFrontCw: 'Y', DrumFrontCcw: 'X', DrumBackCw: 'B', DrumBackCcw: 'A',
};
const MAPEO_TECLADO_DEFECTO = {
  ArmFrontUp: 'KeyW', ArmFrontDown: 'KeyS', ArmBackUp: 'KeyE', ArmBackDown: 'KeyD',
  DrumFrontCw: 'KeyR', DrumFrontCcw: 'KeyF', DrumBackCw: 'KeyT', DrumBackCcw: 'KeyG',
};

// Índices de botón W3C de los gatillos analógicos (LT/RT), reservados por el
// esquema de gatillo+stick: mientras se sostienen, el stick de esa misma
// mano deja de mover el robot y pasa a subir/bajar el brazo correspondiente.
const INDICE_LT = 6;
const INDICE_RT = 7;

// El modal guarda nombres de botón de mando estándar (Xbox), no índices.
// Este es el orden del "standard gamepad mapping" del W3C, el mismo que ya
// asume el resto del archivo para los ejes del stick izquierdo.
const GAMEPAD_BOTON_INDICE = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  Back: 8, Start: 9, LS: 10, RS: 11,
  Up: 12, Down: 13, Left: 14, Right: 15,
};

const NIVEL_MAX = 10;
const PERIODO_TELEMETRIA_MS = 100;

// Todas las entradas llegan ya en -1..1, así que el nivel es la magnitud
// llevada a los diez segmentos de la barra.
function aNivel(valor) {
  const magnitud = Math.min(Math.abs(valor), 1);
  return Math.round(magnitud * NIVEL_MAX);
}

/**
 * Instantánea COMPLETA del estado, nunca cambios incrementales: así el paquete
 * puede ir sin retransmisión (Lossy) y una pérdida se corrige sola con el
 * siguiente, 100 ms después, en vez de bloquear la cola esperando un reenvío.
 * De paso, un espectador que entra a media sesión se sincroniza sin heartbeat.
 *
 * Recibe {avance, giro} ya normalizados a -1..1 en el marco del OPERADOR, que
 * es lo que el espectador quiere ver.
 */
function construirTelemetria({ avance: ejeAvance, giro: ejeGiro }, actuadoresInternos, hayRobot) {
  const nivelAvance = aNivel(ejeAvance);
  const nivelGiro = aNivel(ejeGiro);

  const actuadores = {};
  for (const [componente, accion] of Object.entries(actuadoresInternos)) {
    const clave = COMPONENTE_PUBLICO[componente];
    if (!clave || !accion) continue;
    actuadores[clave] = ACCION_PUBLICA[String(accion).toLowerCase()] ?? 'activo';
  }

  return {
    v: 1,
    avance: nivelAvance > 0 ? { dir: ejeAvance >= 0 ? 'adelante' : 'atras', nivel: nivelAvance } : null,
    giro: nivelGiro > 0 ? { dir: ejeGiro >= 0 ? 'derecha' : 'izquierda', nivel: nivelGiro } : null,
    actuadores,
    // Esto es lo que el operador ORDENA, no lo que el robot hace. Sin esta
    // bandera el espectador vería "avanzando 60%" con el robot apagado y sin
    // nadie recibiendo los comandos, que es justo lo que no debe pasar en una
    // transmisión pública.
    robot: Boolean(hayRobot),
  };
}

export default function ControllerApp({ onBack, robot, controlMappings, mode = 'manual' }) {
  const { t } = useLanguage();
  const [isMobile] = useState(window.innerWidth <= 932);
  const [hasKeyboard, setHasKeyboard] = useState(false);
  const [visible, setVisible] = useState(true);
  const [visible1, setVisible1] = useState(true);
  const [visible2, setVisible2] = useState(false);
  const [error, setError] = useState(null);
  const [opcion, setOpcion] = useState('Set0');
  const [token, setToken] = useState("");
  const [connect, setConnect] = useState(false);
  const [isFetchingToken, setIsFetchingToken] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRobotConnected, setIsRobotConnected] = useState(false);
  const [audiencia, setAudiencia] = useState(0);
  const [binPacket, setBinPacket] = useState(null);

  // Refs para el envío continuo del joystick (dead-man's switch)
  const joystickPosRef = useRef({ x: 0, y: 0 });
  const continuousSendActiveRef = useRef(false);

  const [joystickSize, setJystickSize] = useState(136)
  const [sensitivity, setSensitivity] = useState(1.0)

  const [hasGamepad, setHasGamepad] = useState(false);
  const [forceMobileMode, setForceMobileMode] = useState(false);
  // true cuando el mando conectado no tiene el mapping 'standard' del W3C:
  // controladores PS, Nintendo, VR wands, gamepads BLE propios. Algunos
  // reportan sus ejes sin el orden estándar y se avisa al operador.
  const [hasNonStandardGamepad, setHasNonStandardGamepad] = useState(false);

  const gamepadStateRef = useRef({ x: 0, y: 0, buttons: {} });
  // Estado del esquema de gatillo+stick: qué gatillo está sostenido y qué
  // acción de brazo quedó encendida por última vez, para solo llamar a
  // handleAction en los cruces (igual que checkButton con un botón normal).
  const gatilloArmRef = useRef({
    lt: false, rt: false,
    armFront: null, // 'Up' | 'Down' | null
    armBack: null,
  });
  const roomRef = useRef(null);
  const isConnectedRef = useRef(false);
  // Evita apilar múltiples await para paquetes del joystick: si hay un envío
  // en vuelo, el próximo tick usa el valor actualizado de joystickPosRef en
  // lugar de encolar otro mensaje — efecto UDP last-write-wins sin backpressure.
  const isSendingJoystickRef = useRef(false);



  // Funciones de reenvío de botones mantenidos presionados -- se registran
  // aquí en vez de tener un setInterval propio por botón, y un único tick
  // maestro (más abajo) las llama a todas cada 100ms junto con la telemetría
  // y el reenvío del joystick, en vez de tres timers de 100ms corriendo por
  // separado.
  const buttonSendersRef = useRef({});

  // Qué actuador está activo ahora mismo, para la telemetría. Se lleva aparte
  // de buttonSendersRef porque aquel se indexa por `componente-accion` y el
  // camino del gamepad lo suelta con la acción 'stop', que no coincide con la
  // clave con la que se creó.
  const estadoActuadoresRef = useRef({});

  // Los mismos mandos con avance y giro ya nombrados, para la telemetría.
  const ejesTelemetriaRef = useRef({ avance: 0, giro: 0 });

  // Misma barra que ve el espectador, pero alimentada en local: el operador
  // genera estos valores, no tiene por qué esperar a recibirlos de vuelta.
  //
  // Con mando conectado los controles táctiles se ocultan (ver controls-overlay
  // más abajo), y ese hueco es el que aprovecha la barra para expandirse.
  const controlesOcultos = (hasGamepad || hasKeyboard) && !forceMobileMode;

  const entradaActiva = {
    modo: controlesOcultos ? (hasGamepad ? t('telemetria.mando') : (t('telemetria.teclado') || 'Teclado')) : t('telemetria.tactil'),
    activo: hasGamepad || hasKeyboard,
    // Solo tiene sentido alternar si de verdad hay un mando que ignorar.
    onAlternar: (hasGamepad || hasKeyboard) ? () => setForceMobileMode((v) => !v) : undefined,
    atajo: hasKeyboard ? '(Esc)' : undefined,
    esTactil: !controlesOcultos,
  };



  const telemetriaLocal = useCallback(
    () => construirTelemetria(
      ejesTelemetriaRef.current,
      estadoActuadoresRef.current,
      identidadesDeRobots(roomRef.current).length > 0
    ),
    []
  );

  const handleAction = useCallback((component, action, state) => {
    if (!roomRef.current || !isConnectedRef.current) return;

    if (state) {
      estadoActuadoresRef.current[component] = action;
    } else {
      delete estadoActuadoresRef.current[component];
    }

    const commandObj = { component, action, state };
    const commandStr = JSON.stringify(commandObj);
    const encoder = new TextEncoder();
    const data = encoder.encode(commandStr);

    const sendCommand = async () => {
      // Un array vacío en destinationIdentities significa DIFUNDIR A TODOS en
      // LiveKit, no "a nadie". Si el robot no está en la sala hay que omitir el
      // envío por completo, o los comandos acabarían llegando a los
      // espectadores justo cuando no hay robot que los reciba.
      const destinos = identidadesDeRobots(roomRef.current);
      if (destinos.length === 0) return;
      try {
        await roomRef.current.localParticipant.publishData(data, { reliable: false, topic: TOPIC });
      } catch (err) {
        console.error('Error sending command:', err);
      }
    };

    const key = `${component}-${action}`;

    if (state) {
      // Enviar inmediatamente + registrar para reenvío continuo en el tick
      // maestro de 100ms
      sendCommand();
      buttonSendersRef.current[key] = sendCommand;
    } else {
      // Detener reenvío continuo + enviar comando de stop
      delete buttonSendersRef.current[key];
      sendCommand();
    }
  }, []);

  // Mapeo efectivo: lo guardado en el perfil, completado con los valores por
  // defecto para cualquier acción que el operador no haya tocado en el modal.
  // Indexado por índice de botón / código de tecla (no por la clave
  // `${Componente}${Accion}`), que es como se va a consultar en cada frame o
  // en cada evento de teclado.
  const mapaGamepadPorIndice = useMemo(() => {
    const mapeo = { ...MAPEO_GAMEPAD_DEFECTO, ...(controlMappings?.gamepad || {}) };
    const porIndice = {};
    for (const { clave, component, action } of MAPEO_ACCIONES) {
      // Los brazos ya no son bindeables en mando (los maneja el esquema de
      // gatillo+stick de pollGamepad); si un perfil viejo trae una
      // configuración de antes de este cambio, se ignora aquí en vez de
      // arrastrarla.
      if (clave.startsWith('Arm')) continue;
      const indice = GAMEPAD_BOTON_INDICE[mapeo[clave]];
      // Índices 6/7 (LT/RT) quedan reservados por el sistema para los
      // gatillos, sin importar lo que diga un mapeo guardado.
      if (indice != null && indice !== INDICE_LT && indice !== INDICE_RT) {
        porIndice[indice] = { component, action };
      }
    }
    return porIndice;
  }, [controlMappings]);

  const mapaTecladoPorCodigo = useMemo(() => {
    const mapeo = { ...MAPEO_TECLADO_DEFECTO, ...(controlMappings?.keyboard || {}) };
    const porCodigo = {};
    for (const { clave, component, action } of MAPEO_ACCIONES) {
      const codigo = mapeo[clave];
      if (codigo) porCodigo[codigo] = { component, action };
    }
    return porCodigo;
  }, [controlMappings]);

  // Construye un paquete binario con la posición actual
  const buildPacket = useCallback((deadX, deadY) => {
    const packet = new ArrayBuffer(12)
    const view = new DataView(packet)
    const timestamp = Math.floor(performance.now())
    view.setUint32(0, timestamp, true)
    view.setFloat32(4, deadX, true)
    view.setFloat32(8, deadY, true)
    return new Uint8Array(packet)
  }, [])

  // Envía un paquete directamente por LiveKit
  const sendPacketNow = useCallback(async (pkt) => {
    if (roomRef.current && isConnectedRef.current && pkt) {
      const destinos = identidadesDeRobots(roomRef.current);
      if (destinos.length === 0) return;
      // Last-write-wins: si ya hay un envío del joystick en vuelo, se descarta
      // este paquete — el siguiente tick traerá el valor más reciente.
      if (isSendingJoystickRef.current) return;
      isSendingJoystickRef.current = true;
      try {
        await roomRef.current.localParticipant.publishData(pkt, { reliable: false, topic: TOPIC });
      } catch (err) {
        console.error('Error sending joystick data:', err);
      } finally {
        isSendingJoystickRef.current = false;
      }
    }
  }, [])

  // Inicia el envío continuo del joystick (dead-man's switch): el tick
  // maestro de abajo lo recoge en cuanto está activo.
  const startContinuousSend = useCallback(() => {
    continuousSendActiveRef.current = true;
  }, [])

  // Detiene el envío continuo y manda un último paquete de frenado (0,0) de
  // inmediato, sin esperar al próximo tick.
  const stopContinuousSend = useCallback(() => {
    continuousSendActiveRef.current = false;
    const stopPkt = buildPacket(0, 0);
    sendPacketNow(stopPkt);
  }, [buildPacket, sendPacketNow])

  // ---------------------------------------------------------------------------
  // Joystick de cámara (pan/tilt), solo en modo manual
  //
  // Mismo patrón dead-man's switch que el joystick de movimiento (una bandera
  // que el tick maestro recoge, no un setInterval propio), pero mandando JSON
  // en vez del paquete binario de 12 bytes: robot_receiver_prod.py distingue
  // movimiento de comandos por el TAMAÑO del payload (12 bytes exactos =
  // movimiento), así que la cámara tiene que ir por el camino JSON o se
  // leería como telemetría de movimiento por error. Sin hardware conectado
  // todavía esto es protocolo-listo/no-op del lado del robot.
  // ---------------------------------------------------------------------------
  const cameraPosRef = useRef({ pan: 0, tilt: 0 });
  const cameraActiveRef = useRef(false);

  const sendCameraPacketNow = useCallback(async (pan, tilt) => {
    if (!roomRef.current || !isConnectedRef.current) return;
    const destinos = identidadesDeRobots(roomRef.current);
    if (destinos.length === 0) return;
    try {
      const data = new TextEncoder().encode(JSON.stringify({ component: 'Camera', pan, tilt }));
      await roomRef.current.localParticipant.publishData(data, { reliable: false, topic: TOPIC });
    } catch (err) {
      console.error('Error sending camera data:', err);
    }
  }, []);

  const startCameraContinuousSend = useCallback(() => {
    cameraActiveRef.current = true;
  }, []);

  const stopCameraContinuousSend = useCallback(() => {
    cameraActiveRef.current = false;
    sendCameraPacketNow(0, 0);
  }, [sendCameraPacketNow]);

  const handleCameraMove = useCallback((pan, tilt) => {
    const deadZone = 0.05;
    const applyDeadZone = (v) => Math.abs(v) < deadZone ? 0 : v;
    const deadPan = applyDeadZone(pan);
    const deadTilt = applyDeadZone(tilt);

    cameraPosRef.current = { pan: deadPan, tilt: deadTilt };

    if (Math.abs(deadPan) > 0 || Math.abs(deadTilt) > 0) {
      startCameraContinuousSend();
    } else {
      stopCameraContinuousSend();
    }
  }, [startCameraContinuousSend, stopCameraContinuousSend]);

  // Tick maestro único a 100ms: antes había tres setInterval de 100ms
  // desalineados (botones mantenidos, telemetría, reenvío del joystick),
  // cada uno recalculando identidadesDeRobots() y publicando por su cuenta.
  // Un solo timer que arma y despacha los cuatro reduce jitter y basura de GC
  // (el joystick de cámara se suma aquí en vez de traer su propio timer).
  useEffect(() => {
    const tickMaestro = setInterval(() => {
      // 1. Botones mantenidos: reenvío continuo de cada comando activo.
      for (const enviar of Object.values(buttonSendersRef.current)) {
        enviar();
      }

      // 2. Telemetría pública para los espectadores: se DIFUNDE (sin
      // destinationIdentities) porque va dirigida a ellos, y va en Lossy
      // porque cada paquete lleva el estado completo y una pérdida se
      // corrige sola 100ms después. Retransmitir es justo lo que metería
      // retraso.
      if (roomRef.current && isConnectedRef.current) {
        const resumen = construirTelemetria(
          ejesTelemetriaRef.current,
          estadoActuadoresRef.current,
          identidadesDeRobots(roomRef.current).length > 0
        );
        roomRef.current.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(resumen)),
          { topic: TOPIC_TELEMETRIA, reliable: false }
        ).catch(() => {
          // Silenciado: el transporte de datos puede no estar listo aún.
          // El siguiente tick (100ms) reintentará automáticamente.
        });
      }

      // 3. Reenvío continuo del joystick (dead-man's switch).
      if (continuousSendActiveRef.current) {
        const { x, y } = joystickPosRef.current;
        sendPacketNow(buildPacket(x, y));
      }

      // 4. Reenvío continuo del joystick de cámara (mismo dead-man's switch).
      if (cameraActiveRef.current) {
        const { pan, tilt } = cameraPosRef.current;
        sendCameraPacketNow(pan, tilt);
      }
    }, PERIODO_TELEMETRIA_MS);

    // Cuando la pestaña queda oculta, los keyup de Joystck.jsx ya no llegan
    // (el fix de blur los cubre, pero buttonSendersRef lo maneja ControllerApp
    // directamente). Se vacía aquí para que el tick maestro no siga llamando
    // esas funciones con la consola en segundo plano.
    const detenerBotones = () => {
      if (document.hidden) {
        // Enviar un stop por cada botón activo antes de limpiar el mapa.
        for (const [clave, _] of Object.entries(buttonSendersRef.current)) {
          const partes = clave.split('-');
          if (partes.length >= 2) {
            const component = partes[0];
            const action = partes[1];
            const stopObj = { component, action, state: false };
            const data = new TextEncoder().encode(JSON.stringify(stopObj));
            const destinos = identidadesDeRobots(roomRef.current);
            if (destinos.length > 0 && roomRef.current) {
              roomRef.current.localParticipant.publishData(data, { reliable: true, topic: TOPIC }).catch(() => {});
            }
          }
        }
        buttonSendersRef.current = {};
        estadoActuadoresRef.current = {};
        continuousSendActiveRef.current = false;
        cameraActiveRef.current = false;
      }
    };
    document.addEventListener('visibilitychange', detenerBotones);

    return () => {
      clearInterval(tickMaestro);
      document.removeEventListener('visibilitychange', detenerBotones);
    };
  }, [buildPacket, sendPacketNow, sendCameraPacketNow]);

  // Las tres entradas —táctil, teclado y mando— entregan ya lo mismo: -1..1,
  // con x de avance e y de giro. Antes cada una traía su propia escala y su
  // propio orden de ejes, así que el robot recibía cosas distintas según con
  // qué estuvieras conduciendo.
  const handleMove = useCallback((x, y) => {
    const deadZone = 0.05
    const applyDeadZone = (v) => Math.abs(v) < deadZone ? 0 : v

    const applySensivity = (value) => {
      const sign = Math.sign(value)
      const magnitude = Math.abs(value)
      return sign * Math.pow(magnitude, 1 / sensitivity)
    }

    const deadX = applySensivity(applyDeadZone(x))
    const deadY = applySensivity(applyDeadZone(y))

    // Guardar posición actual en el ref
    joystickPosRef.current = { x: deadX, y: deadY };

    ejesTelemetriaRef.current = { avance: deadX, giro: deadY };
    window.dispatchEvent(new CustomEvent('joystickMove', { detail: { x: deadX, y: deadY } }));

    // Si hay movimiento, iniciar envío continuo; si es (0,0), frenar
    if (Math.abs(deadX) > 0 || Math.abs(deadY) > 0) {
      startContinuousSend();
    } else {
      stopContinuousSend();
    }

    // También devolver el paquete para el setBinPack del Joystick component
    return buildPacket(deadX, deadY)
  }, [sensitivity, buildPacket, startContinuousSend, stopContinuousSend])

  useEffect(() => {
    const handleGamepadConnected = (e) => {
      setHasGamepad(true);
      // Detectar si el mando tiene el mapping estándar del W3C o uno propio.
      // Controladores PS, Nintendo, algunos BLE y la mayoría de wands de VR
      // reportan mapping='' (vacío) porque el navegador no sabe cómo remapearlos.
      // En ese caso se avisa al operador y se usa un modo heurístico en pollGamepad.
      const esEstandar = e.gamepad?.mapping === 'standard';
      setHasNonStandardGamepad(!esEstandar);
    };
    const handleGamepadDisconnected = (e) => {
      setHasGamepad(false);
      setHasNonStandardGamepad(false);
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    let animationFrameId;
    const pollGamepad = () => {
      if (navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
          const gp = gamepads[i];
          if (gp) {
            const deadZone = 0.15;
            // Un mando puede conectarse sin haber disparado 'gamepadconnected'
            // (algunos navegadores solo lo hacen al pulsar un botón). Se comprueba
            // el mapping aquí también por si ese primer poll llega antes del evento.
            if (!hasGamepad && (gp.axes.some(a => Math.abs(a) > deadZone) || gp.buttons.some(b => b.pressed))) {
              setHasGamepad(true);
              setHasNonStandardGamepad(gp.mapping !== 'standard');
            }

            // ----------------------------------------------------------------
            // Detección de mapeo: standard vs. no-standard
            //
            // 'standard' (Xbox, la mayoría de mandos USB en Windows/Linux):
            //   Axes: 0=LX, 1=LY, 2=RX, 3=RY
            //   Buttons: 0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 6=LT, 7=RT, ...
            //
            // No-standard (PS en macOS sin driver, Nintendo Switch Pro,
            // wands de VR como Oculus/Meta/Valve Index):
            //   - PS: axes 0/1=LStick, 2/5=RStick, botones reordenados
            //   - Nintendo: A/B/X/Y rotados 90°
            //   - VR wands: pueden tener 6+ ejes (6DOF: pos+rot) y ningún
            //     botón coincide con el mapa estándar.
            //
            // Estrategia para no-standard: primer stick funcional = movimiento.
            // Se busca el primer par de ejes (0,1), (2,3), etc. con algún valor
            // fuera de la dead zone. Así un PS/Nintendo/VR wand mueve el robot
            // en cuanto se mueve el stick principal, sin config extra.
            // ----------------------------------------------------------------
            const esEstandar = gp.mapping === 'standard';

            // --- Gatillo + stick: mientras se sostiene LT/RT, el stick de esa
            // misma mano deja de mover el robot y sube/baja el brazo
            // correspondiente en su lugar. RT usa el stick DERECHO, que el
            // movimiento nunca lee, así que sostenerlo no afecta la
            // conducción; LT comparte el stick izquierdo con el movimiento,
            // así que sostenerlo sí lo congela.
            const gatillo = gatilloArmRef.current;
            const ltPresionado = esEstandar ? Boolean(gp.buttons[INDICE_LT]?.pressed) : false;
            const rtPresionado = esEstandar ? Boolean(gp.buttons[INDICE_RT]?.pressed) : false;

            if ((ltPresionado || rtPresionado) && !hasGamepad) {
              setHasGamepad(true);
            }

            if (ltPresionado && !gatillo.lt) {
              // Frenar una sola vez al tomar el gatillo, no en cada frame.
              handleMove(0, 0);
              gamepadStateRef.current.x = 0;
              gamepadStateRef.current.y = 0;
            }
            gatillo.lt = ltPresionado;
            gatillo.rt = rtPresionado;

            const aplicarBrazoPorStick = (ejeY, brazoActualClave, component) => {
              let ay = gp.axes[ejeY] || 0;
              if (Math.abs(ay) < deadZone) ay = 0;
              // Empujar el stick hacia arriba es eje negativo (misma
              // convención que ya usa el movimiento: ly=-1 es "adelante").
              const nuevaAccion = ay < 0 ? 'Up' : ay > 0 ? 'Down' : null;
              if (nuevaAccion !== gatillo[brazoActualClave]) {
                if (gatillo[brazoActualClave]) handleAction(component, gatillo[brazoActualClave], false);
                if (nuevaAccion) handleAction(component, nuevaAccion, true);
                gatillo[brazoActualClave] = nuevaAccion;
              }
            };

            if (ltPresionado) {
              aplicarBrazoPorStick(1, 'armFront', 'ArmFront');
            } else if (gatillo.armFront) {
              handleAction('ArmFront', gatillo.armFront, false);
              gatillo.armFront = null;
            }

            if (rtPresionado) {
              aplicarBrazoPorStick(3, 'armBack', 'ArmBack');
            } else if (gatillo.armBack) {
              handleAction('ArmBack', gatillo.armBack, false);
              gatillo.armBack = null;
            }

            // El stick izquierdo solo mueve el robot cuando no está prestado
            // al brazo delantero.
            if (!ltPresionado) {
              let lx, ly;

              if (esEstandar) {
                // Mapping estándar (Xbox): ejes fijos.
                lx = gp.axes[0] || 0;
                ly = gp.axes[1] || 0;
              } else {
                // Mapping no-standard: buscar el primer par de ejes con
                // actividad fuera de la dead zone. Cubre PS (0/1 en Windows,
                // 0/1 también en macOS), Nintendo (0/1) y VR wands (varía,
                // pero el primer stick suele ser el primario en todos).
                // Se toma el par (ejeBase, ejeBase+1) que tenga mayor magnitud.
                let maxMag = 0;
                lx = 0; ly = 0;
                for (let j = 0; j + 1 < gp.axes.length; j += 2) {
                  const ax = gp.axes[j] || 0;
                  const ay = gp.axes[j + 1] || 0;
                  const mag = Math.hypot(ax, ay);
                  if (mag > maxMag) {
                    maxMag = mag;
                    lx = ax;
                    ly = ay;
                  }
                }
              }

              if (Math.abs(lx) < deadZone) lx = 0;
              if (Math.abs(ly) < deadZone) ly = 0;

              // En -1..1 y con el mismo orden que el joystick táctil: primero
              // el avance, luego el giro. Antes iba en -100..100 y con los
              // ejes al revés, así que con mando el robot recibía el giro
              // donde esperaba el avance, y cien veces más grande de lo que
              // manda el táctil.
              const x = -ly;
              const y = lx;

              if (x !== gamepadStateRef.current.x || y !== gamepadStateRef.current.y) {
                if (!hasGamepad && (Math.abs(x) > 0 || Math.abs(y) > 0)) {
                  setHasGamepad(true);
                }
                handleMove(x, y);
                gamepadStateRef.current.x = x;
                gamepadStateRef.current.y = y;
              }
            }

            const checkButton = (index, component, action) => {
              const pressed = gp.buttons[index]?.pressed;
              const wasPressed = gamepadStateRef.current.buttons[index];
              if (pressed && !wasPressed) {
                if (!hasGamepad) {
                  setHasGamepad(true);
                }
                handleAction(component, action, true);
                gamepadStateRef.current.buttons[index] = true;
              } else if (!pressed && wasPressed) {
                handleAction(component, action, false);
                gamepadStateRef.current.buttons[index] = false;
              }
            };

            // Para gamepads no-standard se usan los mismos índices: en la
            // práctica los botones de cara (0-3) suelen coincidir o estar muy
            // cerca en PS/Nintendo. El operador puede reasignarlos desde el
            // modal de configuración.
            for (const indice in mapaGamepadPorIndice) {
              const { component, action } = mapaGamepadPorIndice[indice];
              checkButton(Number(indice), component, action);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(pollGamepad);
    };

    animationFrameId = requestAnimationFrame(pollGamepad);

    // Antes, pulsar W/A/S/D, una flecha o Q/E/O/P marcaba hasGamepad y con ello
    // se ocultaba TODA la capa de controles: brazos, tambores, joystick y
    // estado. O sea que conducir con el teclado dejaba la consola en blanco,
    // sin nada visible salvo el fondo.
    //
    // Usar el teclado no significa querer la pantalla vacía: se puede alternar
    // entre teclado y dedo en la misma sesión. Solo un mando de verdad
    // reemplaza a los controles táctiles, y eso ya lo detectan el evento
    // gamepadconnected y el sondeo de ejes de aquí arriba.

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasGamepad, handleMove, handleAction, mapaGamepadPorIndice]);

  // Teclado para brazos y tambores, según el mapeo del operador. Aparte del
  // movimiento (W/A/S/D/flechas), que ya maneja Joystck.jsx -- esas teclas no
  // se tocan aquí. Ojo: con los valores por defecto del modal de mapeo, W/S/D
  // coinciden con teclas de movimiento; el operador puede reasignarlas desde
  // ahí si le estorba.
  useEffect(() => {
    const presionadas = new Set();

    const alPresionar = (e) => {
      const entrada = mapaTecladoPorCodigo[e.code];
      if (!entrada || presionadas.has(e.code)) return;
      presionadas.add(e.code);
      handleAction(entrada.component, entrada.action, true);
    };
    const alSoltar = (e) => {
      const entrada = mapaTecladoPorCodigo[e.code];
      if (!entrada) return;
      presionadas.delete(e.code);
      handleAction(entrada.component, entrada.action, false);
    };

    
    const alDetectarTeclado = (e) => {
      if (e.key === 'Escape') {
        setForceMobileMode((prev) => !prev);
        return;
      }
      if (e.key.startsWith('F') || e.key === 'Meta' || e.key === 'Alt' || e.key === 'Control' || e.key === 'Shift' || e.key === 'Tab') return;
      setHasKeyboard(true);
      setForceMobileMode(false);
    };
    window.addEventListener('keydown', alDetectarTeclado);
    window.addEventListener('keydown', alPresionar);
    window.addEventListener('keyup', alSoltar);
    return () => {
      window.removeEventListener('keydown', alDetectarTeclado);
      window.removeEventListener('keydown', alPresionar);
      window.removeEventListener('keyup', alSoltar);
    };
  }, [mapaTecladoPorCodigo, handleAction]);

  useEffect(() => {
    if (opcion === 'Set1') {
      setVisible1(false);
      setVisible(true);
    } else if (opcion === 'Set2') {
      setVisible1(true);
      setVisible(false);
    }
  }, [opcion]);

  useEffect(() => {
    if (token !== '') {
      setVisible2(false);
      setVisible1(true);
      setVisible(true);
    }
  }, [connect, token]);

  const connectToLiveKit = useCallback(async (authToken, customUrl) => {
    if (!authToken) {
      setError(t('operador.controller.errorSinToken'));
      return;
    }

    try {
      const { Room, RoomEvent, setLogLevel } = await livekitClientPromise;
      // El propio SDK trae su nivel de log en 'info' por defecto, que en
      // producción llena la consola con cada cambio de estado de la señal.
      // 'warn' conserva lo que sí importa: advertencias y errores reales.
      setLogLevel('warn');
      const roomInstance = new Room();
      const finalUrl = customUrl || SERVER_URL;

      await roomInstance.connect(finalUrl, authToken, {
        autoSubscribe: true
      });


      setIsConnected(true);
      isConnectedRef.current = true;
      setRoom(roomInstance);
      roomRef.current = roomInstance;


      // Solo cuentan los participantes que SON el robot. Contar cualquier
      // participante remoto valía cuando en la sala solo estaban operador y
      // robot; con espectadores públicos entrando a la misma sala, uno de ellos
      // encendía el "Link Status: ONLINE" con el robot apagado.
      const refrescarEnlace = () => {
        setIsRobotConnected(identidadesDeRobots(roomInstance).length > 0);
        setAudiencia(contarEspectadores(roomInstance));
      };
      refrescarEnlace();

      roomInstance.on(RoomEvent.ParticipantConnected, (participant) => {
        refrescarEnlace();
      });
      roomInstance.on(RoomEvent.ParticipantDisconnected, (participant) => {
        refrescarEnlace();
      });
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('LiveKit connection error:', err);
    }
  }, []);

  // Fetch API token basado en la room del robot
  useEffect(() => {
    if (robot && !connect && !hasFetched) {
      setHasFetched(true);
      setIsFetchingToken(true);

      const fetchToken = async () => {
        try {
          const res = await apiFetch('/api/livekit-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ robotId: robot.id })
          });

          const data = await res.json();
          if (data.success && data.token) {
             setToken(data.token);
             setConnect(true);
             connectToLiveKit(data.token, data.livekitUrl);
          } else {
             setError(data.message || t('operador.controller.errorTokenGeneracion'));
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsFetchingToken(false);
        }
      };

      fetchToken();
    }
  }, [robot, connect, hasFetched, connectToLiveKit]);

  const disconnect = useCallback(async () => {
    if (room) {
      stopContinuousSend();
      stopCameraContinuousSend();

      room.disconnect();
      setRoom(null);
      roomRef.current = null;
      setIsConnected(false);
      isConnectedRef.current = false;
      setConnect(false);
    }
  }, [room, stopContinuousSend, stopCameraContinuousSend]);

  return (
    <div className="App App-header">
      {isFetchingToken && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 999999, background: 'var(--background)' }}>
          <div className="loading-spinner" style={{ width: '64px', height: '64px', border: '4px solid var(--surface)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px' }} />
          <h2 style={{ fontFamily: 'var(--font-titulo)', color: 'var(--accent)', margin: 0, letterSpacing: '0.2em' }}>
            {t('operador.controller.estableciendoEnlace')}
          </h2>
          <p style={{ fontFamily: 'var(--font-ibm-mono)', color: 'var(--muted)', marginTop: '8px' }}>
            {t('operador.controller.obteniendoToken')} {robot?.room}
          </p>
        </div>
      )}

      {/* Modo VR: escena propia (pantalla virtual + wands), nada del
          dashboard 2D de abajo tiene sentido con el visor puesto. */}
      {!isFetchingToken && mode === 'vr' && (
        <Suspense fallback={
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
            <Loader2 className="animate-spin" size={48} color="var(--accent)" />
          </div>
        }>
          <VRConsole
            room={room}
            isConnected={isConnected}
            onMove={handleMove}
            onAction={handleAction}
            onCameraAim={handleCameraMove}
            onExit={onBack}
          />
        </Suspense>
      )}

      {/* 1. Fullscreen Video Background Component */}
      {mode !== 'vr' && (
      <div className="video-background-container" style={{ opacity: visible && !isFetchingToken ? '1' : '0', transition: 'opacity 0.5s ease-out' }}>
        <VideoViewer room={room}
          isConnected={isConnected} />
      </div>
      )}

      {/* El estado del mando ya no vive suelto aquí: es telemetría del
          operador y se muestra como el chip ENTRADA dentro de la barra, que
          además es pulsable para volver a los controles táctiles. El Reset por
          detección falsa pasó al menú de esa misma barra. */}

      {/* Siempre visible, no detrás de un botón. En modo esencial ocupa solo el
          hueco central que dejan el joystick y los botones en sus esquinas;
          cuando la Gamepad API detecta mando esos controles se ocultan y la
          barra se estira para aprovechar el espacio liberado. */}
      {!isFetchingToken && mode !== 'vr' && (
        <BarraTelemetria
          room={room}
          fuenteLocal={telemetriaLocal}
          posicion={controlesOcultos ? "abajo" : "arriba"}
          margen={24}
          esencial={!controlesOcultos}
          entrada={entradaActiva}
          audiencia={audiencia}
          widgetsIniciales={WIDGETS_OPERADOR}
          isRobotConnected={isRobotConnected}
          modelUrl={robot?.model_url || robot?.modelUrl}
        />
      )}

      {/* 2. Interactive Controls Layered On Top */}
      {mode !== 'vr' && (
      <div className="controls-overlay" style={{ pointerEvents: controlesOcultos || isFetchingToken ? 'none' : 'auto' }}>
        <div style={{ opacity: controlesOcultos || isFetchingToken ? 0 : 1, visibility: controlesOcultos || isFetchingToken ? 'hidden' : 'visible', transition: 'all 0.5s ease-out', width: '100%', height: '100%' }}>
        <div id="left-panel">
          <div className='arms' style={{ opacity: visible ? '1' : '0' }}>
            <Segment id="arms">
              <h3>{t('operador.controller.brazos')}</h3>
              <div className="arm-controls">
                <ControlGroup
                  title={t('operador.controller.frente')}
                  groupClass="arm-group"
                  buttons={[{ label: "▲", onPress: () => handleAction('ArmFront', 'Up', true), onRelease: () => handleAction('ArmFront', 'Up', false) }, { label: "▼", onPress: () => handleAction('ArmFront', 'Down', true), onRelease: () => handleAction('ArmFront', 'Down', false) }]}
                />
                <ControlGroup
                  title={t('operador.controller.trasero')}
                  groupClass="arm-group"
                  buttons={[{ label: "▲", onPress: () => handleAction('ArmBack', 'Up', true), onRelease: () => handleAction('ArmBack', 'Up', false) }, { label: "▼", onPress: () => handleAction('ArmBack', 'Down', true), onRelease: () => handleAction('ArmBack', 'Down', false) }]}
                />
              </div>
            </Segment>
          </div>

          <Segment id="joystick" style={{ display: visible1 ? 'flex' : 'none', height: Math.max(230, joystickSize + 80) }}>
            <h3>{t('operador.controller.controlJoystick')}</h3>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile && mode === 'manual' ? 16 : 0 }}>
              <Joystck
                onMove={handleMove}
                onStop={handleMove}
                setBinPack={setBinPacket}
                size={isMobile && mode === 'manual' ? Math.round(joystickSize * 0.75) : joystickSize}
              />
              {/* En mobile no hay espacio para un segundo Segment aparte, así
                  que la cámara comparte fila con el joystick de movimiento. */}
              {isMobile && mode === 'manual' && (
                <Joystck
                  onMove={handleCameraMove}
                  onStop={handleCameraMove}
                  size={Math.round(joystickSize * 0.75)}
                  dispatchGlobalEvent={false}
                  keyboardEnabled={false}
                />
              )}
            </div>
          </Segment>
        </div>

        <div id="right-panel">
          <div className='drums' style={{ opacity: visible ? '1' : '0' }}>
            <Segment id="drums">
              <h3>{t('operador.controller.tambores')}</h3>
              <div className="drum-controls">
                <ControlGroup
                  title={t('operador.controller.frente')}
                  groupClass="drum-group"
                  buttons={[{ label: <RotateCcw size={24} />, onPress: () => handleAction('DrumFront', 'Ccw', true), onRelease: () => handleAction('DrumFront', 'Ccw', false) }, { label: <RotateCw size={24} />, onPress: () => handleAction('DrumFront', 'Cw', true), onRelease: () => handleAction('DrumFront', 'Cw', false) }]}
                />
                <ControlGroup
                  title={t('operador.controller.trasero')}
                  groupClass="drum-group"
                  buttons={[{ label: <RotateCcw size={24} />, onPress: () => handleAction('DrumBack', 'Ccw', true), onRelease: () => handleAction('DrumBack', 'Ccw', false) }, { label: <RotateCw size={24} />, onPress: () => handleAction('DrumBack', 'Cw', true), onRelease: () => handleAction('DrumBack', 'Cw', false) }]}
                />
              </div>
            </Segment>
          </div>

          {/* La tarjeta de ESTADO se fue a la barra de telemetría: todo lo que
              mostraba está ya ahí y mejor colocado -- el estado del enlace es
              el punto verde/rojo de la cabecera de la franja, LIN X y ANG Z
              son AVANCE y GIRO, y la audiencia es un widget más. Mantenerla
              era repetir los mismos cuatro datos en dos sitios y, de paso,
              dejar la columna derecha con una tarjeta más que la izquierda. */}

          {/* Solo en modo manual y solo en escritorio/tablet: en mobile ya va
              junto al joystick de movimiento, arriba. Sin telemetría propia
              todavía -- no hay pan/tilt físico que confirme nada.

              Mismo tamaño y misma altura de tarjeta que el joystick de
              movimiento de enfrente: las dos columnas llevan ahora dos
              tarjetas cada una y se leen como una rejilla, así que un mando
              más pequeño aquí se ve como un descuadre, no como una jerarquía.
              Iba al 70% de cuando la columna derecha tenía tres tarjetas y
              había que robarle alto a algo. */}
          {!isMobile && mode === 'manual' && (
            <Segment id="camera-joystick" style={{ display: visible1 ? 'flex' : 'none', height: Math.max(230, joystickSize + 80) }}>
              <h3>{t('operador.controller.controlCamara')}</h3>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Joystck
                  onMove={handleCameraMove}
                  onStop={handleCameraMove}
                  size={joystickSize}
                  dispatchGlobalEvent={false}
                  keyboardEnabled={false}
                />
              </div>
            </Segment>
          )}
        </div>


        </div>

        <Cabezal
          onCambio={setOpcion}
          onConfigApply={({ size, sensitivity: newSensitivity }) => {
            setJystickSize(size)
            setSensitivity(newSensitivity)
          }}
          onBack={onBack}
          titulo={robot?.name}
        />

      <div style={{ position: 'relative', zIndex: 110, opacity: hasGamepad ? 0 : 1, visibility: hasGamepad ? 'hidden' : 'visible', transition: 'all 0.5s ease-out', pointerEvents: 'none' }}>
        <div id='liveconn' style={{ pointerEvents: visible2 ? 'auto' : 'none' }}>
          <Segment id="connection" style={{ opacity: visible2 ? '1' : '0', pointerEvents: visible2 ? 'auto' : 'none' }}>
            <h3>{t('operador.controller.conexionLivekit')}</h3>
            {!isConnected ? (
              <>
                <input
                  type="text"
                  placeholder={t('operador.controller.ingresarToken')}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="styled-input"
                />
                <button onClick={() => { connectToLiveKit(token); setConnect(true); }} className="boton">
                  {t('operador.controller.conectar')}
                </button>
                {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
              </>
            ) : (
              <>
                <p style={{ color: 'var(--success)' }}>{t('operador.controller.conectadoTrinity')}</p>
                <button onClick={disconnect} className="boton">
                  {t('operador.controller.desconectar')}
                </button>
              </>
            )}
          </Segment>
        </div>


        <div id="container">
          <Segment id="wheels" style={{ display: 'none' }}>
            <h3>{t('operador.controller.ruedas')}</h3>
            <div className="control-grid">
              <ControlButton label={t('operador.controller.adelante')} onPress={() => handleAction('Wheel', 'Forward', true)} onRelease={() => handleAction('Wheel', 'Forward', false)} />
              <ControlButton label={t('operador.controller.izquierda')} onPress={() => handleAction('Wheel', 'Left', true)} onRelease={() => handleAction('Wheel', 'Left', false)} />
              <ControlButton label={t('operador.controller.derecha')} onPress={() => handleAction('Wheel', 'Right', true)} onRelease={() => handleAction('Wheel', 'Right', false)} />
              <ControlButton label={t('operador.controller.atras')} onPress={() => handleAction('Wheel', 'Backward', true)} onRelease={() => handleAction('Wheel', 'Backward', false)} />
            </div>
          </Segment>


        </div>

        <Segment id="login-conteiner">
          <Login id="login" />
        </Segment>
        </div>


      </div>
      )}
    </div>
  );
}
