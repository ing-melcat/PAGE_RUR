import { useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import {
  ACTUADORES,
  ETIQUETAS_ACCION,
  ETIQUETAS_AVANCE,
  ETIQUETAS_GIRO,
  INACTIVIDAD_MS,
  NIVEL_MAX,
  TELEMETRIA_VACIA,
  TOPIC_TELEMETRIA,
  decodificarTelemetria,
} from '../telemetria';
import { WIDGETS, cargarWidgets, guardarWidgets } from '../widgets';
import { useEstadisticasEnlace } from '../useEstadisticasEnlace';

/**
 * Barra de telemetría del espectador, al estilo de las transmisiones de SpaceX:
 * pegada al borde inferior y con degradado en vez de un bloque sólido, para que
 * el centro del encuadre quede siempre libre.
 *
 * Solo lee del canal de datos: el operador publica un resumen ya traducido
 * (niveles de 0 a 10 y nombres en español), nunca el protocolo de control. Este
 * componente no sabría decodificar un comando aunque lo recibiera.
 */

const APAGADO = 'rgba(245, 243, 233, 0.12)';

const S = {
  etiqueta: {
    fontFamily: 'var(--font-ibm-mono)', fontSize: '0.68rem', color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
  },
  pie: {
    fontFamily: 'var(--font-ibm-mono)', fontSize: '0.7rem', letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
};

function BarraSegmentos({ nivel, transicion }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {Array.from({ length: NIVEL_MAX }, (_, i) => (
        <div
          key={i}
          style={{
            width: '9px', height: '9px',
            background: i < nivel ? 'var(--accent)' : APAGADO,
            boxShadow: i < nivel ? '0 0 6px rgba(251, 202, 1, 0.5)' : 'none',
            transition: transicion,
          }}
        />
      ))}
    </div>
  );
}

function ModuloAvance({ avance, transicion }) {
  const nivel = avance?.nivel ?? 0;
  const activo = nivel > 0 && Boolean(avance?.dir);
  const chevron = avance?.dir === 'atras' ? '▼' : '▲';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={S.etiqueta}>Avance</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{
          fontFamily: 'var(--font-ibm-mono)', fontSize: '1.5rem', lineHeight: 1,
          color: activo ? 'var(--accent)' : 'var(--muted)', transition: transicion,
        }}>
          {chevron}
        </span>
        <span style={{
          fontFamily: 'var(--font-ibm-mono)', fontSize: '2.2rem', lineHeight: 1,
          color: activo ? 'var(--bone)' : 'var(--muted)', transition: transicion,
        }}>
          {nivel * 10}
        </span>
        <span style={{ ...S.etiqueta, fontSize: '0.8rem' }}>%</span>
      </div>
      <BarraSegmentos nivel={nivel} transicion={transicion} />
      <span style={{ ...S.pie, color: activo ? 'var(--bone)' : 'var(--muted)' }}>
        {activo ? ETIQUETAS_AVANCE[avance.dir] : 'Detenido'}
      </span>
    </div>
  );
}

function ModuloGiro({ giro, transicion }) {
  const nivel = giro?.nivel ?? 0;
  const activo = nivel > 0 && Boolean(giro?.dir);
  const signo = giro?.dir === 'izquierda' ? -1 : 1;
  // La cinta cubre +-45% para que el indicador no se salga por los bordes.
  const desplazamiento = activo ? (signo * nivel * 45) / NIVEL_MAX : 0;

  const chevron = (dir, glifo) => (
    <span style={{
      fontFamily: 'var(--font-ibm-mono)', fontSize: '0.9rem', transition: transicion,
      color: activo && giro.dir === dir ? 'var(--accent)' : APAGADO,
    }}>
      {glifo}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={S.etiqueta}>Giro</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {chevron('izquierda', '◀')}
        <div style={{
          position: 'relative', width: '150px', height: '30px',
          // La escala de fondo hace legible cuánto se ha movido el indicador.
          backgroundImage: 'repeating-linear-gradient(to right, rgba(245,243,233,0.18) 0 1px, transparent 1px 15px)',
          backgroundPosition: 'center',
        }}>
          <div style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px',
            background: 'rgba(245, 243, 233, 0.45)', transform: 'translateX(-50%)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: `${50 + desplazamiento}%`,
            width: '3px', height: '22px', background: activo ? 'var(--accent)' : 'var(--muted)',
            boxShadow: activo ? '0 0 8px rgba(251, 202, 1, 0.6)' : 'none',
            transform: 'translate(-50%, -50%)', transition: transicion,
          }} />
        </div>
        {chevron('derecha', '▶')}
      </div>
      <span style={{ ...S.pie, color: activo ? 'var(--bone)' : 'var(--muted)' }}>
        {activo ? `${ETIQUETAS_GIRO[giro.dir]} ${nivel}` : 'Centrado'}
      </span>
    </div>
  );
}

function ModuloActuadores({ actuadores, transicion }) {
  const activos = ACTUADORES.filter(({ clave }) => actuadores[clave]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={S.etiqueta}>Actuadores</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '6px 16px' }}>
        {ACTUADORES.map(({ clave, abrev }) => {
          const encendido = Boolean(actuadores[clave]);
          return (
            <div key={clave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: encendido ? 'var(--accent)' : APAGADO,
                boxShadow: encendido ? '0 0 8px var(--accent)' : 'none',
                transition: transicion,
              }} />
              <span style={{
                fontFamily: 'var(--font-ibm-mono)', fontSize: '0.7rem', letterSpacing: '0.05em',
                color: encendido ? 'var(--bone)' : 'var(--muted)', transition: transicion,
              }}>
                {abrev}
              </span>
            </div>
          );
        })}
      </div>
      <span style={{ ...S.pie, color: 'var(--accent)', minHeight: '1em' }}>
        {activos.map(({ clave }) => ETIQUETAS_ACCION[actuadores[clave]] ?? actuadores[clave]).join(' · ')}
      </span>
    </div>
  );
}

/** Lectura genérica para los widgets de enlace: etiqueta, número grande y pie. */
function ModuloDato({ titulo, valor, unidad, pie, transicion }) {
  const hayDato = valor !== null && valor !== undefined && valor !== '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '92px' }}>
      <p style={S.etiqueta}>{titulo}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{
          fontFamily: 'var(--font-ibm-mono)', fontSize: '1.6rem', lineHeight: 1,
          color: hayDato ? 'var(--bone)' : 'var(--muted)', transition: transicion,
        }}>
          {hayDato ? valor : '—'}
        </span>
        {unidad && <span style={{ ...S.etiqueta, fontSize: '0.7rem' }}>{unidad}</span>}
      </div>
      <span style={{ ...S.pie, color: 'var(--muted)', minHeight: '1em' }}>{pie ?? ''}</span>
    </div>
  );
}

export function BarraTelemetria({ room }) {
  const [telemetria, setTelemetria] = useState(TELEMETRIA_VACIA);
  const [enVivo, setEnVivo] = useState(false);
  const [compacta, setCompacta] = useState(() => window.innerWidth < 900);
  const [sinMovimiento, setSinMovimiento] = useState(false);
  const [activos, setActivos] = useState(cargarWidgets);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const ultimoRef = useRef(0);

  // Las estadísticas del enlace solo se piden si hay algún widget que las use:
  // sin esto se estaría sondeando la conexión cada segundo para nada.
  const necesitaEnlace = activos.some(
    (id) => WIDGETS.find((w) => w.id === id)?.fuente === 'enlace'
  );
  const enlace = useEstadisticasEnlace(room, necesitaEnlace);

  const alternar = (id) => {
    setActivos((previos) => {
      const siguientes = previos.includes(id)
        ? previos.filter((x) => x !== id)
        : [...previos, id];
      guardarWidgets(siguientes);
      return siguientes;
    });
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => setSinMovimiento(media.matches);
    aplicar();
    media.addEventListener('change', aplicar);
    return () => media.removeEventListener('change', aplicar);
  }, []);

  useEffect(() => {
    const alRedimensionar = () => setCompacta(window.innerWidth < 900);
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, []);

  useEffect(() => {
    if (!room) return;

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
  }, [room]);

  useEffect(() => {
    const id = setInterval(() => {
      if (ultimoRef.current && Date.now() - ultimoRef.current > INACTIVIDAD_MS) {
        setEnVivo(false);
        setTelemetria(TELEMETRIA_VACIA);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Se iguala al periodo de la telemetría: suaviza el salto entre paquetes sin
  // añadir retraso perceptible por encima de los 100 ms que ya tarda el dato.
  const transicion = sinMovimiento ? 'none' : 'all 0.1s linear';

  return (
    <div
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
        // Degradado en vez de un bloque sólido: no corta el video en seco.
        background: 'linear-gradient(to bottom, rgba(2, 7, 19, 0) 0%, rgba(2, 7, 19, 0.85) 45%, rgba(2, 7, 19, 0.94) 100%)',
        paddingTop: '28px',
        // Informativa: nunca debe robarle el clic al enlace de Salir ni al video.
        pointerEvents: 'none',
        opacity: enVivo ? 1 : 0.45,
        transition: sinMovimiento ? 'none' : 'opacity 0.3s ease',
      }}
    >
      <div style={{ borderTop: '1px solid var(--border)', margin: '0 24px' }} />
      <div
        style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: compacta ? 'flex-start' : 'space-between',
          flexWrap: compacta ? 'wrap' : 'nowrap',
          gap: compacta ? '18px 28px' : '40px',
          padding: compacta ? '14px 20px 18px' : '18px 40px 22px',
        }}
      >
        {/* El orden lo manda el catálogo, no este archivo: así un widget nuevo
            aparece en su sitio con solo añadirlo a WIDGETS. */}
        {WIDGETS.filter((w) => activos.includes(w.id)).map(({ id }) => {
          switch (id) {
            case 'avance':
              return <ModuloAvance key={id} avance={telemetria.avance} transicion={transicion} />;
            case 'giro':
              return <ModuloGiro key={id} giro={telemetria.giro} transicion={transicion} />;
            case 'actuadores':
              return <ModuloActuadores key={id} actuadores={telemetria.actuadores} transicion={transicion} />;
            case 'calidad':
              return <ModuloDato key={id} titulo="Enlace" valor={enlace?.calidad} transicion={transicion} />;
            case 'bitrate':
              return <ModuloDato key={id} titulo="Bitrate" valor={enlace?.bitrateKbps} unidad="kbps" transicion={transicion} />;
            case 'video':
              return (
                <ModuloDato
                  key={id}
                  titulo="Video"
                  valor={enlace?.ancho ? `${enlace.ancho}×${enlace.alto}` : null}
                  pie={enlace?.fps != null ? `${enlace.fps} fps · ${enlace.framesCaidos} caídos` : ''}
                  transicion={transicion}
                />
              );
            case 'perdida':
              return (
                <ModuloDato
                  key={id}
                  titulo="Pérdida"
                  valor={enlace?.perdidos}
                  unidad="paq."
                  pie={enlace?.jitterMs != null ? `jitter ${enlace.jitterMs} ms · búfer ${enlace.bufferMs} ms` : ''}
                  transicion={transicion}
                />
              );
            case 'audiencia':
              return <ModuloDato key={id} titulo="Espectadores" valor={enlace?.espectadores} transicion={transicion} />;
            default:
              return null;
          }
        })}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignSelf: compacta ? 'flex-start' : 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: enVivo ? 'var(--success)' : 'var(--error)',
              boxShadow: `0 0 8px ${enVivo ? 'var(--success)' : 'var(--error)'}`,
              transition: transicion,
            }} />
            <span style={{ ...S.pie, color: enVivo ? 'var(--success)' : 'var(--error)' }}>
              {enVivo ? 'En vivo' : 'Sin señal'}
            </span>
          </div>
          {/* Estos valores son las órdenes del operador. Si no hay robot
              conectado no las está recibiendo nadie, y hay que decirlo o el
              espectador creería que la unidad se está moviendo. */}
          {enVivo && !telemetria.robot && (
            <span style={{ ...S.pie, color: 'var(--accent)' }}>Sin robot conectado</span>
          )}

          {/* La barra entera lleva pointerEvents:none para no estorbar al video,
              así que lo interactivo tiene que reactivarlo por su cuenta. */}
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            style={{
              pointerEvents: 'auto', cursor: 'pointer', alignSelf: 'flex-start',
              background: 'transparent', border: `1px solid ${menuAbierto ? 'var(--accent)' : 'var(--border)'}`,
              color: menuAbierto ? 'var(--accent)' : 'var(--muted)',
              borderRadius: '4px', padding: '4px 10px', marginTop: '2px',
              fontFamily: 'var(--font-ibm-mono)', fontSize: '0.7rem',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            ⊞ Widgets
          </button>
        </div>
      </div>

      {menuAbierto && (
        <div
          style={{
            pointerEvents: 'auto',
            position: 'absolute', bottom: '100%', right: compacta ? '20px' : '40px',
            marginBottom: '10px', minWidth: '230px',
            background: 'rgba(2, 7, 19, 0.96)', backdropFilter: 'blur(6px)',
            border: '1px solid var(--border)', borderRadius: '4px', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}
        >
          <p style={{ ...S.etiqueta, margin: 0 }}>Elige qué ver</p>

          {WIDGETS.map(({ id, label, fuente }) => {
            const encendido = activos.includes(id);
            // Un widget cuyos datos aún no llegan se puede encender igual, pero
            // se avisa para que nadie crea que está roto.
            const sinDatos = fuente === 'enlace' && necesitaEnlace && !enlace;
            return (
              <label
                key={id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                  fontFamily: 'var(--font-ibm-mono)', fontSize: '0.75rem',
                  color: encendido ? 'var(--bone)' : 'var(--muted)',
                }}
              >
                <input
                  type="checkbox"
                  checked={encendido}
                  onChange={() => alternar(id)}
                  style={{ width: 'auto', accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <span style={{ flex: 1 }}>{label}</span>
                {sinDatos && <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>sin datos</span>}
              </label>
            );
          })}

          <span style={{ ...S.pie, color: 'var(--muted)', fontSize: '0.65rem', lineHeight: 1.5 }}>
            Tu selección se guarda en este navegador.
          </span>
        </div>
      )}
    </div>
  );
}
