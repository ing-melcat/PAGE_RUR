import { Fragment, useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';

/**
 * Muestra en el espectador lo que está haciendo el operador.
 *
 * El operador difunde sus mandos por el canal de datos de LiveKit
 * (ControllerApp.jsx, topic 'control') sin destinatario concreto, así que el
 * mismo paquete que recibe el robot llega también a los espectadores. Aquí
 * solo se decodifica y se pinta: este componente nunca envía nada, y el token
 * del espectador viene firmado con canPublishData:false, así que aunque se
 * manipulara esta página no podría mandar un comando al robot.
 *
 * Son los dos formatos que ya consume robot_receiver_prod.py:
 *   - joystick: 12 bytes binarios -> uint32 timestamp, float32 x, float32 y (LE)
 *   - botones : JSON {component, action, state}
 */

// El operador reenvía cada mando cada 100 ms mientras lo mantiene. Si dejan de
// llegar paquetes es que soltó los controles o se desconectó; sin esto los
// últimos valores se quedarían congelados en pantalla como si siguiera
// conduciendo.
const INACTIVIDAD_MS = 2000;

const COMPONENTES = [
  { key: 'ArmFront', label: 'BRAZO DEL.' },
  { key: 'ArmBack', label: 'BRAZO TRAS.' },
  { key: 'DrumFront', label: 'TAMBOR DEL.' },
  { key: 'DrumBack', label: 'TAMBOR TRAS.' },
  { key: 'Wheel', label: 'RUEDAS' },
];

function decodificar(payload) {
  if (payload.byteLength === 12) {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    return { tipo: 'joystick', x: view.getFloat32(4, true), y: view.getFloat32(8, true) };
  }
  try {
    const cmd = JSON.parse(new TextDecoder().decode(payload));
    if (cmd && cmd.component) return { tipo: 'comando', ...cmd };
  } catch {
    // Paquete de otro formato: no es asunto de este HUD.
  }
  return null;
}

const estilos = {
  panel: {
    position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000,
    display: 'flex', gap: '20px', alignItems: 'stretch',
    background: 'rgba(0,0,0,0.6)', padding: '16px 20px', borderRadius: '4px',
    backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)',
    fontFamily: 'var(--font-ibm-mono)', pointerEvents: 'none',
  },
  titulo: {
    fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--muted)',
    margin: '0 0 10px 0', textTransform: 'uppercase',
  },
  valor: { fontSize: '0.85rem', color: 'var(--accent)' },
  etiqueta: { fontSize: '0.7rem', color: 'var(--muted)' },
};

export function OperatorHUD({ room }) {
  const [joystick, setJoystick] = useState({ x: 0, y: 0 });
  const [acciones, setAcciones] = useState({});
  const [enVivo, setEnVivo] = useState(false);
  const ultimoRef = useRef(0);

  useEffect(() => {
    if (!room) return;

    const alRecibir = (payload) => {
      const dato = decodificar(payload);
      if (!dato) return;
      ultimoRef.current = Date.now();
      setEnVivo(true);
      if (dato.tipo === 'joystick') {
        setJoystick({ x: dato.x, y: dato.y });
      } else {
        setAcciones((prev) => ({ ...prev, [dato.component]: dato.state ? dato.action : null }));
      }
    };

    room.on(RoomEvent.DataReceived, alRecibir);
    return () => room.off(RoomEvent.DataReceived, alRecibir);
  }, [room]);

  useEffect(() => {
    const id = setInterval(() => {
      if (ultimoRef.current && Date.now() - ultimoRef.current > INACTIVIDAD_MS) {
        setEnVivo(false);
        setJoystick({ x: 0, y: 0 });
        setAcciones({});
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  // x es el avance (linear_x) y va en el eje vertical; y es el giro (angular_z)
  // y va en el horizontal, igual que los lee el receptor del robot.
  const izquierda = 50 + joystick.y * 45;
  const arriba = 50 - joystick.x * 45;

  return (
    <div style={estilos.panel}>
      <div>
        <h4 style={estilos.titulo}>Mando del operador</h4>
        <div style={{ position: 'relative', width: '90px', height: '90px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div
            style={{
              position: 'absolute', width: '14px', height: '14px', borderRadius: '50%',
              background: enVivo ? 'var(--accent)' : 'var(--muted)',
              boxShadow: enVivo ? '0 0 10px var(--accent)' : 'none',
              left: `${izquierda}%`, top: `${arriba}%`, transform: 'translate(-50%, -50%)',
              transition: 'left 0.1s linear, top 0.1s linear',
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '2px 10px', marginTop: '10px' }}>
          <span style={estilos.etiqueta}>LIN X</span>
          <span style={estilos.valor}>{joystick.x.toFixed(2)}</span>
          <span style={estilos.etiqueta}>ANG Z</span>
          <span style={estilos.valor}>{joystick.y.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h4 style={estilos.titulo}>
          Actuadores {!enVivo && <span style={{ color: 'var(--muted)' }}>· sin señal</span>}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '6px 14px' }}>
          {COMPONENTES.map(({ key, label }) => {
            const accion = acciones[key];
            return (
              <Fragment key={key}>
                <span style={estilos.etiqueta}>{label}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: accion ? 'var(--accent)' : 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                  }}
                >
                  {accion ? `▶ ${accion}` : '—'}
                </span>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
