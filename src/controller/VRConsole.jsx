import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { XR, createXRStore, useXRInputSourceState } from '@react-three/xr';
import * as THREE from 'three';
import { useLiveKitVideoTrack } from './useLiveKitVideoTrack';
import { useLanguage } from '../lib/i18n';

// ---------------------------------------------------------------------------
// Modo VR — SIN VALIDAR EN HARDWARE REAL
//
// Escrito con el HTC Vive presente en el plan pero sin poder probarlo en esta
// sesión (no hay visor a la mano). Antes de usarlo en la universidad:
//  1. Hay un bug conocido de compatibilidad Chromium + SteamVR con WebXR --
//     confirmar que `navigator.xr.isSessionSupported('immersive-vr')`
//     resuelve `true` ahí antes de asumir que el resto funciona.
//  2. Los índices de botón/eje de más abajo son el mapeo público y estable
//     del perfil "htc-vive" del registro de WebXR input-profiles (trigger,
//     squeeze/grip y click del touchpad, en ese orden) -- es la referencia
//     documentada del dispositivo, no algo que se haya podido correr aquí.
// ---------------------------------------------------------------------------

// `emulate: false` a propósito: el store, por defecto, intenta cargar un
// emulador de visor de escritorio para desarrollo local (ver vite.config.ts
// para por qué ese paquete queda excluido del bundle).
const xrStore = createXRStore({ controller: false, hand: false, emulate: false });

const BOTON_TRIGGER = 0;
const BOTON_SQUEEZE = 1;
const BOTON_TOUCHPAD = 2;
const ZONA_MUERTA = 0.15;
// Hasta qué ángulo de la cabeza (rad) se normaliza a ±1 de pan/tilt. No hay
// pan/tilt físico todavía para calibrar contra su rango real -- 55° es un
// punto de partida razonable, ajustable aquí una vez exista el hardware.
const ANGULO_MAXIMO_CAMARA = (55 * Math.PI) / 180;

// Pantalla virtual con el feed de la cámara del robot, la única "UI" dentro
// del visor -- el resto del dashboard 2D no tiene sentido reconstruirlo en
// VR (mismo criterio que los proyectos de referencia investigados).
function PantallaVideo({ videoRef }) {
  const meshRef = useRef(null);
  const texturaRef = useRef(null);

  useFrame(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    if (!texturaRef.current) {
      const textura = new THREE.VideoTexture(video);
      textura.colorSpace = THREE.SRGBColorSpace;
      texturaRef.current = textura;
      if (meshRef.current) {
        meshRef.current.material.map = textura;
        meshRef.current.material.needsUpdate = true;
      }
    }
    texturaRef.current.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} position={[0, 1.6, -2.5]}>
      <planeGeometry args={[3.5, 1.97]} />
      <meshBasicMaterial color="#0a0a0a" toneMapped={false} />
    </mesh>
  );
}

// Todo el control en sí: no dibuja nada, solo lee los wands cuadro a cuadro
// y llama a las mismas funciones que ya usan el mando Xbox/PlayStation y el
// joystick de cámara en modo manual.
function ControlXR({ onMove, onAction, onCameraAim }) {
  const camera = useThree((s) => s.camera);
  const calibracionRef = useRef(null); // { yaw, pitch } del primer frame

  const izquierdo = useXRInputSourceState('controller', 'left');
  const derecho = useXRInputSourceState('controller', 'right');

  const estadoRef = useRef({
    ltSostenido: false,
    armFront: null,
    armBack: null,
    leftSqueeze: false,
    leftTouchpad: false,
    rightSqueeze: false,
    rightTouchpad: false,
  });

  useFrame(() => {
    const estado = estadoRef.current;

    // --- Apuntado de cámara por movimiento de cabeza ---
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    if (!calibracionRef.current) {
      // Se calibra contra la dirección a la que mira el operador al entrar,
      // no contra un "adelante" absoluto del espacio de referencia -- si no,
      // el pan saldría descentrado según hacia dónde estuviera parado.
      calibracionRef.current = { yaw: euler.y, pitch: euler.x };
    }
    const pan = THREE.MathUtils.clamp((euler.y - calibracionRef.current.yaw) / ANGULO_MAXIMO_CAMARA, -1, 1);
    const tilt = THREE.MathUtils.clamp((euler.x - calibracionRef.current.pitch) / ANGULO_MAXIMO_CAMARA, -1, 1);
    onCameraAim(pan, tilt);

    const gpL = izquierdo?.inputSource?.gamepad;
    const gpR = derecho?.inputSource?.gamepad;

    // --- Wand izquierdo: gatillo+stick para ArmFront / movimiento ---
    // (mismo esquema que LT en el mando Xbox: sostener el gatillo presta el
    // eje Y del touchpad al brazo en vez de mover el robot)
    const ltPresionado = Boolean(gpL?.buttons?.[BOTON_TRIGGER]?.pressed);
    if (ltPresionado && !estado.ltSostenido) {
      onMove(0, 0);
    }
    estado.ltSostenido = ltPresionado;

    if (ltPresionado) {
      let ay = gpL?.axes?.[1] || 0;
      if (Math.abs(ay) < ZONA_MUERTA) ay = 0;
      const accion = ay < 0 ? 'Up' : ay > 0 ? 'Down' : null;
      if (accion !== estado.armFront) {
        if (estado.armFront) onAction('ArmFront', estado.armFront, false);
        if (accion) onAction('ArmFront', accion, true);
        estado.armFront = accion;
      }
    } else {
      if (estado.armFront) {
        onAction('ArmFront', estado.armFront, false);
        estado.armFront = null;
      }
      let lx = gpL?.axes?.[0] || 0;
      let ly = gpL?.axes?.[1] || 0;
      if (Math.abs(lx) < ZONA_MUERTA) lx = 0;
      if (Math.abs(ly) < ZONA_MUERTA) ly = 0;
      onMove(-ly, lx);
    }

    // --- Wand derecho: gatillo+stick para ArmBack. Sin joystick de cámara
    // que compartir con él -- el apuntado ya sale de la cabeza -- así que no
    // congela ni condiciona nada más. ---
    const rtPresionado = Boolean(gpR?.buttons?.[BOTON_TRIGGER]?.pressed);
    if (rtPresionado) {
      let ay2 = gpR?.axes?.[1] || 0;
      if (Math.abs(ay2) < ZONA_MUERTA) ay2 = 0;
      const accion2 = ay2 < 0 ? 'Up' : ay2 > 0 ? 'Down' : null;
      if (accion2 !== estado.armBack) {
        if (estado.armBack) onAction('ArmBack', estado.armBack, false);
        if (accion2) onAction('ArmBack', accion2, true);
        estado.armBack = accion2;
      }
    } else if (estado.armBack) {
      onAction('ArmBack', estado.armBack, false);
      estado.armBack = null;
    }

    // --- Tambores: el wand del Vive no tiene botones A/B/X/Y como un mando
    // Xbox, solo trigger + squeeze/grip + click del touchpad. Con el
    // trigger reservado por el esquema de arriba, quedan 2 botones libres
    // por mano para las 4 acciones de tambor. ---
    const revisarBoton = (gp, indiceBoton, claveEstado, component, action) => {
      const presionado = Boolean(gp?.buttons?.[indiceBoton]?.pressed);
      if (presionado !== estado[claveEstado]) {
        onAction(component, action, presionado);
        estado[claveEstado] = presionado;
      }
    };
    revisarBoton(gpL, BOTON_SQUEEZE, 'leftSqueeze', 'DrumFront', 'Cw');
    revisarBoton(gpL, BOTON_TOUCHPAD, 'leftTouchpad', 'DrumFront', 'Ccw');
    revisarBoton(gpR, BOTON_SQUEEZE, 'rightSqueeze', 'DrumBack', 'Cw');
    revisarBoton(gpR, BOTON_TOUCHPAD, 'rightTouchpad', 'DrumBack', 'Ccw');
  });

  return null;
}

export function VRConsole({ room, isConnected, onMove, onAction, onCameraAim, onExit }) {
  const { t } = useLanguage();
  const { videoRef } = useLiveKitVideoTrack(room, isConnected);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      {/* Fuera del Canvas: alimenta la textura de video, nunca se ve directo. */}
      <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: 24, left: 24, right: 24, zIndex: 10, display: 'flex', justifyContent: 'space-between' }}>
        <button className="back-link" onClick={onExit}>{t('operador.vr.volver')}</button>
        <button className="boton" onClick={() => xrStore.enterVR()}>{t('operador.vr.entrar')}</button>
      </div>

      <p style={{ position: 'absolute', bottom: 24, left: 24, right: 24, zIndex: 10, textAlign: 'center', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--muted)' }}>
        {t('operador.vr.aviso')}
      </p>

      <Canvas camera={{ position: [0, 1.6, 0] }}>
        <XR store={xrStore}>
          <ambientLight intensity={0.9} />
          <PantallaVideo videoRef={videoRef} />
          <ControlXR onMove={onMove} onAction={onAction} onCameraAim={onCameraAim} />
        </XR>
      </Canvas>
    </div>
  );
}
