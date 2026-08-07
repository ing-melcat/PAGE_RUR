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
import '../BarraTelemetria.css';

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

// El mismo lenguaje que el resto del sitio: las tarjetas .Datos de App.css y
// los paneles del panel de administración. Fondo sólido en --surface, esquinas
// afiladas de 2px y títulos en ámbar subrayados, en vez del HUD translúcido con
// etiquetas apagadas que se probó antes.
const TARJETA = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '2px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(4px)',
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
      <p className="telemetria__titulo">Avance</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span
          className={`telemetria__flecha${activo ? '' : ' telemetria__flecha--apagada'}`}
          style={{ transition: transicion }}
        >
          {chevron}
        </span>
        <span
          className={`telemetria__valor${activo ? '' : ' telemetria__valor--apagado'}`}
          style={{ transition: transicion }}
        >
          {nivel * 10}
        </span>
        <span className="telemetria__unidad">%</span>
      </div>
      <BarraSegmentos nivel={nivel} transicion={transicion} />
      <span className={`telemetria__pie${activo ? ' telemetria__pie--destacado' : ''}`}>
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
    <span
      className="telemetria__flecha telemetria__flecha--menor"
      style={{ color: activo && giro.dir === dir ? 'var(--accent)' : APAGADO, transition: transicion }}
    >
      {glifo}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p className="telemetria__titulo">Giro</p>
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
      <span className={`telemetria__pie${activo ? ' telemetria__pie--destacado' : ''}`}>
        {activo ? `${ETIQUETAS_GIRO[giro.dir]} ${nivel}` : 'Centrado'}
      </span>
    </div>
  );
}

function ModuloActuadores({ actuadores, transicion }) {
  const activos = ACTUADORES.filter(({ clave }) => actuadores[clave]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p className="telemetria__titulo">Actuadores</p>
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
              <span
                className={`telemetria__abrev${encendido ? ' telemetria__abrev--encendido' : ''}`}
                style={{ transition: transicion }}
              >
                {abrev}
              </span>
            </div>
          );
        })}
      </div>
      <span className="telemetria__pie telemetria__pie--accion">
        {activos.map(({ clave }) => ETIQUETAS_ACCION[actuadores[clave]] ?? actuadores[clave]).join(' · ')}
      </span>
    </div>
  );
}

/**
 * Lectura de una línea para el modo esencial: etiqueta chica y el valor al
 * lado. Sin barras ni cintas — ahí la gracia es ocupar poco.
 */
function LecturaCorta({ titulo, valor, activo, transicion }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
      <span className="telemetria__titulo telemetria__titulo--inline">{titulo}</span>
      <span
        className={`telemetria__valor telemetria__valor--medio${activo ? '' : ' telemetria__valor--apagado'}`}
        style={{ transition: transicion }}
      >
        {valor}
      </span>
    </div>
  );
}

/**
 * Modo de entrada activo. Es pulsable cuando hay mando: tocarlo devuelve los
 * controles táctiles, que es la única acción útil sobre este dato.
 */
function ChipEntrada({ entrada, transicion }) {
  if (!entrada) return null;
  const { modo, activo, onAlternar } = entrada;
  const pulsable = typeof onAlternar === 'function';

  return (
    <button
      onClick={pulsable ? onAlternar : undefined}
      disabled={!pulsable}
      title={pulsable ? 'Cambiar entre mando y controles táctiles' : undefined}
      style={{
        pointerEvents: pulsable ? 'auto' : 'none',
        cursor: pulsable ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: '7px',
        background: 'transparent', border: 'none', padding: 0,
      }}
    >
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: activo ? 'var(--success)' : 'var(--muted)',
        boxShadow: activo ? '0 0 8px var(--success)' : 'none',
        transition: transicion,
      }} />
      <span className="telemetria__titulo telemetria__titulo--inline">Entrada</span>
      <span className="telemetria__valor telemetria__valor--medio" style={{ textTransform: 'uppercase' }}>
        {modo}
      </span>
    </button>
  );
}

/** Lectura genérica para los widgets de enlace: etiqueta, número grande y pie. */
function ModuloDato({ titulo, valor, unidad, pie, transicion }) {
  const hayDato = valor !== null && valor !== undefined && valor !== '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '92px' }}>
      <p className="telemetria__titulo">{titulo}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          className={`telemetria__valor${hayDato ? '' : ' telemetria__valor--apagado'}`}
          style={{ transition: transicion }}
        >
          {hayDato ? valor : '—'}
        </span>
        {unidad && <span className="telemetria__unidad">{unidad}</span>}
      </div>
      <span className="telemetria__pie" style={{ minHeight: '1em' }}>{pie ?? ''}</span>
    </div>
  );
}

/**
 * @param room         sala de LiveKit, para las estadísticas del enlace.
 * @param fuenteLocal  si se pasa, la telemetría se toma llamando a esta función
 *                     en vez de escuchar el canal de datos. Lo usa el operador,
 *                     que genera esos valores él mismo y no tiene por qué
 *                     esperarlos de vuelta por la red.
 * @param posicion     'abajo' para el espectador, 'arriba' para el operador,
 *                     que tiene joystick y botones anclados al borde inferior.
 * @param margen       píxeles de separación desde ese borde. El operador lo usa
 *                     para no quedar debajo de su cabezal fijo.
 * @param esencial     modo discreto, tipo OSD de dron: solo lo justo para
 *                     comprobar qué está haciendo la unidad, en una sola línea
 *                     y ocupando el ancho mínimo. El operador lo usa mientras
 *                     los controles táctiles le ocupan las esquinas de abajo.
 * @param entrada      { modo, activo, onAlternar } para el chip de ENTRADA. El
 *                     estado del mando es telemetría del operador, así que vive
 *                     aquí y no suelto por la pantalla.
 */
export function BarraTelemetria({
  room, fuenteLocal, posicion = 'abajo', margen = 0, esencial = false, entrada,
  accionesMenu = [],
}) {
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

  // Fuente local (operador): se sondea su propio estado al mismo ritmo al que
  // publica. El estado vive aquí dentro y no en quien nos llama, para no
  // re-renderizar toda la consola diez veces por segundo.
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

  // Fuente remota (espectador): el canal de datos de la sala.
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

  // Se iguala al periodo de la telemetría: suaviza el salto entre paquetes sin
  // añadir retraso perceptible por encima de los 100 ms que ya tarda el dato.
  const transicion = sinMovimiento ? 'none' : 'all 0.1s linear';

  const arriba = posicion === 'arriba';

  const panelMenu = menuAbierto ? (
        <div
          style={{
            pointerEvents: 'auto',
            position: 'absolute', right: esencial ? 0 : (compacta ? '20px' : '40px'), minWidth: '230px',
            ...(arriba
              ? { top: '100%', marginTop: '10px' }
              : { bottom: '100%', marginBottom: '10px' }),
            ...TARJETA, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}
        >
          <p className="telemetria__titulo">Elige qué ver</p>

          {WIDGETS.map(({ id, label, fuente }) => {
            const encendido = activos.includes(id);
            // Un widget cuyos datos aún no llegan se puede encender igual, pero
            // se avisa para que nadie crea que está roto.
            const sinDatos = fuente === 'enlace' && necesitaEnlace && !enlace;
            return (
              <label
                key={id}
                className={`telemetria__opcion${encendido ? ' telemetria__opcion--activa' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={encendido}
                  onChange={() => alternar(id)}
                  style={{ width: 'auto', accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <span style={{ flex: 1 }}>{label}</span>
                {sinDatos && <span className="telemetria__nota">sin datos</span>}
              </label>
            );
          })}

          <span className="telemetria__nota">
            Tu selección se guarda en este navegador.
          </span>

          {/* Acciones que no son datos y por eso no van en la barra, pero que
              tampoco merecen un botón fijo ocupando pantalla. */}
          {accionesMenu.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              {accionesMenu.map(({ label, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  style={{
                    cursor: 'pointer', textAlign: 'left', background: 'transparent',
                    border: '1px solid var(--border)', borderRadius: '2px', padding: '6px 10px',
                  }}
                  className="telemetria__accion"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null;

  // Modo esencial: una sola línea con lo justo para comprobar qué está
  // haciendo la unidad. Ancho mínimo y centrada, para caber en el hueco que
  // dejan el joystick y los botones en sus esquinas.
  if (esencial) {
    const { avance, giro, actuadores } = telemetria;
    const encendidos = ACTUADORES.filter(({ clave }) => actuadores[clave]);

    return (
      <div
        style={{
          position: 'absolute', bottom: margen, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, pointerEvents: 'none', maxWidth: 'calc(100vw - 40px)',
          opacity: enVivo ? 1 : 0.5,
          transition: sinMovimiento ? 'none' : 'opacity 0.3s ease',
        }}
      >
        <div style={{
          ...TARJETA,
          display: 'flex', alignItems: 'center', flexWrap: 'wrap',
          gap: '8px 18px', padding: '12px 20px',
        }}>
          <LecturaCorta
            titulo="Avance"
            valor={avance ? `${avance.dir === 'atras' ? '▼' : '▲'} ${avance.nivel * 10}%` : '—'}
            activo={Boolean(avance)}
            transicion={transicion}
          />
          <LecturaCorta
            titulo="Giro"
            valor={giro ? `${giro.dir === 'izquierda' ? '◀' : '▶'} ${giro.nivel * 10}%` : '—'}
            activo={Boolean(giro)}
            transicion={transicion}
          />
          {/* Solo los encendidos: los apagados no gastan espacio aquí. */}
          <LecturaCorta
            titulo="Actuadores"
            valor={encendidos.length > 0 ? encendidos.map((a) => a.abrev).join(' ') : '—'}
            activo={encendidos.length > 0}
            transicion={transicion}
          />

          <ChipEntrada entrada={entrada} transicion={transicion} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: enVivo ? 'var(--success)' : 'var(--error)',
              boxShadow: `0 0 8px ${enVivo ? 'var(--success)' : 'var(--error)'}`,
              transition: transicion,
            }} />
            <span className="telemetria__pie" style={{ color: enVivo ? 'var(--success)' : 'var(--error)' }}>
              {!enVivo ? 'Sin señal' : telemetria.robot ? 'En vivo' : 'Sin robot'}
            </span>
          </div>

          <button
            onClick={() => setMenuAbierto((v) => !v)}
            title="Elegir qué ver"
            style={{
              pointerEvents: 'auto', cursor: 'pointer', background: 'transparent',
              border: 'none', padding: '0 2px', lineHeight: 1,
              color: menuAbierto ? 'var(--accent)' : 'var(--muted)',
            }}
            className="telemetria__accion"
          >
            ⊞
          </button>
        </div>

        {panelMenu}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, zIndex: 1000,
        ...(arriba ? { top: margen } : { bottom: margen }),
        // Tarjeta sólida, como el resto de paneles del sitio, en vez del
        // degradado que se probó antes.
        background: 'var(--surface)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        ...(arriba
          ? { borderBottom: '1px solid var(--border)' }
          : { borderTop: '1px solid var(--border)' }),
        display: 'flex', flexDirection: arriba ? 'column-reverse' : 'column',
        // Informativa: nunca debe robarle el clic al enlace de Salir ni al video.
        pointerEvents: 'none',
        opacity: enVivo ? 1 : 0.45,
        transition: sinMovimiento ? 'none' : 'opacity 0.3s ease',
      }}
    >
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
          {entrada && (
            <div style={{ marginBottom: '2px' }}>
              <ChipEntrada entrada={entrada} transicion={transicion} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: enVivo ? 'var(--success)' : 'var(--error)',
              boxShadow: `0 0 8px ${enVivo ? 'var(--success)' : 'var(--error)'}`,
              transition: transicion,
            }} />
            <span className="telemetria__pie" style={{ color: enVivo ? 'var(--success)' : 'var(--error)' }}>
              {enVivo ? 'En vivo' : 'Sin señal'}
            </span>
          </div>
          {/* Estos valores son las órdenes del operador. Si no hay robot
              conectado no las está recibiendo nadie, y hay que decirlo o el
              espectador creería que la unidad se está moviendo. */}
          {enVivo && !telemetria.robot && (
            <span className="telemetria__pie telemetria__pie--accion">Sin robot conectado</span>
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
              textTransform: 'uppercase',
            }}
            className="telemetria__accion"
          >
            ⊞ Widgets
          </button>
        </div>
      </div>

      {panelMenu}
    </div>
  );
}
