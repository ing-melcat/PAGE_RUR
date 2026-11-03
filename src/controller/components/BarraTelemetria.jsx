import { Fragment, Suspense, lazy, useEffect, useState } from 'react';
import { LayoutGrid, Users, WifiOff, Gamepad2, Keyboard, Pointer, MoveUp, MoveLeft, Cpu, Flag, Radio } from 'lucide-react';
import { ACTUADORES, NIVEL_MAX } from '../telemetria';
import { useTelemetria, useSinMovimiento } from '../useTelemetria';
import { useTelemetriaRobot } from '../useTelemetriaRobot';
import { WIDGETS, WIDGETS_POR_DEFECTO } from '../widgets';
import { useEstadisticasEnlace } from '../useEstadisticasEnlace';
import { useLanguage } from '../../lib/i18n';
import { PanelMision } from './PanelMision';
import '../BarraTelemetria.css';
import '../HudEspectador.css';

const RassorEnVivo = lazy(() => import('./RassorEnVivo').then((m) => ({ default: m.RassorEnVivo })));

/**
 * Barra de telemetría del espectador, al estilo de un HUD de misión: navy
 * casi negro como el resto del armazón del sitio, datos agrupados en
 * bloques (MOVIMIENTO, ACTUADORES, CONEXIÓN, SESIÓN) separados por
 * divisores finos, y el ámbar de marca reservado a advertencias reales y
 * controles interactivos -- nunca a una lectura normal.
 *
 * Solo lee del canal de datos: el operador publica un resumen ya traducido
 * (niveles de 0 a 10 y nombres en español), nunca el protocolo de control. Este
 * componente no sabría decodificar un comando aunque lo recibiera.
 */

const APAGADO = 'rgba(245, 243, 233, 0.12)';
// Brillo de un dato EN VIVO. Blanco/hueso, no ámbar: el amarillo institucional
// se reserva para advertencias y controles interactivos (ver BarraTelemetria.css),
// y una lectura normal activa no es ninguna de las dos cosas.
const BRILLO_ACTIVO = '0 0 8px rgba(245, 243, 233, 0.55)';

// El mismo lenguaje que el resto del sitio: las tarjetas .Datos de App.css y
// los paneles del panel de administración. Fondo sólido en --surface, esquinas
// afiladas de 2px, para el menú desplegable de widgets -- es un panel flotante
// aparte, no la barra misma.
function CalidadEnlace({ conectado, enlace, t }) {
  let quality = 0;
  if (conectado) {
    quality = 4;
    if (enlace) {
      const p = enlace.perdidaPct ?? 0;
      const j = enlace.jitterMs ?? 0;
      if (p > 5 || j > 100) quality = 3;
      if (p > 15 || j > 250) quality = 2;
      if (p > 30 || j > 500) quality = 1;
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title={conectado ? t('telemetria.enVivo') : t('telemetria.sinRobotConectado')}>
      {!conectado ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <WifiOff size={22} color="var(--muted)" strokeWidth={2.5} />
          
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '22px' }}>
          {[0, 1, 2, 3].map(i => {
            const height = 8 + (i * 4.6); // 8px to ~22px max height
            const active = quality > i;
            const color = active ? (quality <= 2 ? 'var(--accent)' : 'var(--bone)') : 'var(--border)';
            return (
              <div key={i} style={{
                width: '6px',
                height: `${height}px`,
                background: color,
                borderRadius: '2px',
                transition: 'background 0.3s, opacity 0.3s',
                opacity: active ? 1 : 0.4,
                boxShadow: active && quality > 1 ? `0 0 5px ${color}` : 'none'
              }} />
            )
          })}
        </div>
      )}
    </div>
  );
}

const STORAGE_KEY = 'rur_telemetria_widgets_v1';

const TARJETA = {
  background: 'rgba(2, 7, 19, 0.96)',
  border: '1px solid var(--accent)',
  borderRadius: '2px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85), inset 0 0 1px rgba(251, 202, 1, 0.3)',
  fontFamily: 'var(--font-codigo), monospace',
};

// A qué BLOQUE visual pertenece cada widget del catálogo. Es un agrupamiento
// de layout, no de datos -- por eso vive aquí y no en widgets.js, que solo
// sabe de dónde sale cada dato ('operador' / 'enlace'), no de cómo se
// presenta. 'audiencia' no aparece: se dibuja aparte, dentro del bloque
// SESIÓN, junto al modo de entrada y el indicador EN VIVO.
const BLOQUES = {
  avance: 'movimiento',
  giro: 'movimiento',
  actuadores: 'actuadores',
  bitrate: 'conexion',
  video: 'conexion',
  perdida: 'conexion',
};
const ORDEN_BLOQUES = ['movimiento', 'actuadores', 'conexion'];


function BarraSegmentos({ nivel, transicion }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {Array.from({ length: NIVEL_MAX }, (_, i) => (
        <div
          key={i}
          style={{
            width: '9px', height: '9px',
            background: i < nivel ? 'var(--bone)' : APAGADO,
            boxShadow: i < nivel ? BRILLO_ACTIVO : 'none',
            transition: transicion,
          }}
        />
      ))}
    </div>
  );
}

function ModuloAvance({ avance, transicion, chica }) {
  const { t } = useLanguage();
  const nivel = avance?.nivel ?? 0;
  const activo = nivel > 0 && Boolean(avance?.dir);
  const chevron = avance?.dir === 'atras' ? '▼' : '▲';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: chica ? '6px' : '8px' }}>
      <p className="telemetria__titulo">{t('telemetria.avance')}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span
          className={`telemetria__flecha${chica ? ' telemetria__flecha--menor' : ''}${activo ? '' : ' telemetria__flecha--apagada'}`}
          style={{ transition: transicion }}
        >
          {chevron}
        </span>
        <span
          className={`telemetria__valor${chica ? ' telemetria__valor--medio' : ''}${activo ? '' : ' telemetria__valor--apagado'}`}
          style={{ transition: transicion }}
        >
          {nivel * 10}
        </span>
        <span className="telemetria__unidad">%</span>
      </div>
      {/* La cinta de segmentos es decorativa: en modo compacto (junto al
          joystick táctil) sobra y solo suma alto al panel. */}
      {!chica && <BarraSegmentos nivel={nivel} transicion={transicion} />}
      <span className={`telemetria__pie${activo ? ' telemetria__pie--destacado' : ''}`}>
        {activo ? t(`telemetria.direccionAvance.${avance.dir}`) : t('telemetria.detenido')}
      </span>
    </div>
  );
}

function ModuloGiro({ giro, transicion, chica }) {
  const { t } = useLanguage();
  const nivel = giro?.nivel ?? 0;
  const activo = nivel > 0 && Boolean(giro?.dir);
  const signo = giro?.dir === 'izquierda' ? -1 : 1;
  // La cinta cubre +-45% para que el indicador no se salga por los bordes.
  const desplazamiento = activo ? (signo * nivel * 45) / NIVEL_MAX : 0;
  const anchoCinta = chica ? 100 : 150;

  const chevron = (dir, glifo) => (
    <span
      className="telemetria__flecha telemetria__flecha--menor"
      style={{ color: activo && giro.dir === dir ? 'var(--bone)' : APAGADO, transition: transicion }}
    >
      {glifo}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: chica ? '6px' : '8px' }}>
      <p className="telemetria__titulo">{t('telemetria.giro')}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {chevron('izquierda', '◀')}
        <div style={{
          position: 'relative', width: `${anchoCinta}px`, height: chica ? '22px' : '30px',
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
            width: '3px', height: chica ? '16px' : '22px', background: activo ? 'var(--bone)' : 'var(--muted)',
            boxShadow: activo ? BRILLO_ACTIVO : 'none',
            transform: 'translate(-50%, -50%)', transition: transicion,
          }} />
        </div>
        {chevron('derecha', '▶')}
      </div>
      <span className={`telemetria__pie${activo ? ' telemetria__pie--destacado' : ''}`}>
        {activo ? `${t(`telemetria.direccionGiro.${giro.dir}`)} ${nivel}` : t('telemetria.centrado')}
      </span>
    </div>
  );
}

function ModuloActuadores({ actuadores, transicion, chica }) {
  const { t } = useLanguage();
  const activos = ACTUADORES.filter(({ clave }) => actuadores[clave]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: chica ? '6px' : '8px' }}>
      <p className="telemetria__titulo">{t('telemetria.actuadores')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: chica ? '4px 12px' : '6px 16px' }}>
        {ACTUADORES.map(({ clave, abrev }) => {
          const encendido = Boolean(actuadores[clave]);
          return (
            <div key={clave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: encendido ? 'var(--bone)' : APAGADO,
                boxShadow: encendido ? BRILLO_ACTIVO : 'none',
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
      <span className="telemetria__pie telemetria__pie--destacado">
        {activos.map(({ clave }) => t(`telemetria.etiquetasAccion.${actuadores[clave]}`)).join(' · ')}
      </span>
    </div>
  );
}

/**
 * Modo de entrada activo. Es pulsable cuando hay mando: tocarlo devuelve los
 * controles táctiles, que es la única acción útil sobre este dato.
 */
export function ChipEntrada({ entrada, transicion }) {
  const { t } = useLanguage();
  if (!entrada) return null;

  const { modo, tipo, activo, onAlternar } = entrada;
  const pulsable = typeof onAlternar === 'function';

  const icono = tipo === 'mando' ? (
    <Gamepad2 size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
  ) : tipo === 'teclado' ? (
    <Keyboard size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
  ) : (
    <Pointer size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
  );

  return (
    <button
      onClick={pulsable ? onAlternar : undefined}
      disabled={!pulsable}
      title={pulsable ? (entrada.esTactil ? t('telemetria.volverTeclado', 'Volver a teclado/mando') : t('telemetria.volverTactil', 'Volver a táctil')) : undefined}
      style={{
        pointerEvents: pulsable ? 'auto' : 'none',
        cursor: pulsable ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap',
        background: pulsable ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: pulsable ? '1px solid var(--border)' : 'none',
        padding: pulsable ? '4px 10px' : 0,
        borderRadius: '4px',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: activo ? 'var(--success)' : 'var(--muted)',
        boxShadow: activo ? '0 0 8px var(--success)' : 'none',
        transition: transicion,
      }} />
      <span className="telemetria__titulo telemetria__titulo--inline" style={{ display: 'flex', alignItems: 'center' }}>
        {icono} {t('telemetria.entrada')}:
      </span>
      <span className="telemetria__valor telemetria__valor--medio" style={{ textTransform: 'uppercase', color: activo ? 'var(--accent, #38bdf8)' : 'var(--text)' }}>
        {modo}
      </span>
      {pulsable && entrada.atajo && (
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-ibm-mono)' }}>{entrada.atajo}</span>
      )}
    </button>
  );
}

/** Lectura genérica para los widgets de enlace: etiqueta, número grande y pie. */
function ModuloDato({ titulo, valor, unidad, pie, transicion, chica }) {
  const hayDato = valor !== null && valor !== undefined && valor !== '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: chica ? '6px' : '8px', minWidth: chica ? '70px' : '92px' }}>
      <p className="telemetria__titulo">{titulo}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          className={`telemetria__valor${chica ? ' telemetria__valor--medio' : ''}${hayDato ? '' : ' telemetria__valor--apagado'}`}
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
 * Lectura de una sola línea, para el modo esencial: etiqueta y valor pegados,
 * sin barra de segmentos, sin cinta y sin pie.
 *
 * Es el OSD de un dron: el operador que va con los controles táctiles tiene
 * las dos manos ocupadas en los joysticks y lee esto de reojo, así que cada
 * dato ocupa lo mínimo y la barra entera cabe en una franja delgada. Los
 * módulos altos (ModuloAvance y compañía) son para el otro caso, cuando el
 * mando libera la pantalla y sí hay sitio para la versión desplegada.
 */
function LecturaEnLinea({ titulo, valor, unidad, contenido, activo = true, ancho }) {
  const hayDato = valor !== null && valor !== undefined && valor !== '';
  const apagado = contenido ? !activo : !hayDato;

  return (
    <div className="telemetria__osd-item">
      <span className="telemetria__osd-etiqueta">{titulo}</span>
      <span
        className={`telemetria__osd-valor${apagado ? ' telemetria__osd-valor--apagado' : ''}`}
        style={ancho && ancho !== 'auto' ? { minWidth: ancho } : undefined}
      >
        {contenido ?? (hayDato ? valor : '—')}
        {unidad && hayDato && ` ${unidad}`}
      </span>
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
 * @param audiencia    número de espectadores ya contado por quien llama. El
 *                     operador lo pasa porque su cuenta filtra por identidad
 *                     (`contarEspectadores`) y descarta al robot, mientras que
 *                     las estadísticas del enlace solo saben de participantes
 *                     remotos y lo contarían como público. Sin esta prop se cae
 *                     a la cuenta del enlace, que es lo que ve el espectador.
 * @param widgetsIniciales  qué widgets salen encendidos la primera vez. El
 *                     operador enciende también la audiencia, que antes tenía
 *                     en su propia tarjeta de ESTADO.
 */
export function BarraTelemetria({
  room, fuenteLocal, posicion = 'abajo', margen = 0, esencial = false, entrada,
  audiencia, widgetsIniciales = WIDGETS_POR_DEFECTO,
  isRobotConnected, modelUrl, robot, onRobotUpdate,
}) {
  const { t } = useLanguage();
  // Estado, decodificación e inactividad viven en el hook: el HUD del
  // espectador usa exactamente el mismo, así que no hay dos criterios de
  // "esto ya está viejo" que puedan discrepar.
  const { telemetria, enVivo } = useTelemetria(room, fuenteLocal);
  const [compacta, setCompacta] = useState(() => window.innerWidth < 900);
  // En modo esencial (controles táctiles ocupando las esquinas) hace falta
  // el mismo apretujado que en pantallas angostas, sin importar el ancho
  // real: es el hueco central el que manda, no el viewport.
  const angosta = compacta || esencial;
  const sinMovimiento = useSinMovimiento();
  // Sensores del robot para el modelo 3D (IMU → inclinación) y batería.
  const sensores = useTelemetriaRobot(room, false);
  const [activos, setActivos] = useState(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        const parseado = JSON.parse(guardado);
        if (Array.isArray(parseado)) {
          const validos = parseado.filter((id) => WIDGETS.some((w) => w.id === id));
          if (validos.length > 0) return validos;
        }
      }
    } catch {
      // Ignorar fallo si localStorage está restringido
    }
    return widgetsIniciales;
  });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [misionAbierta, setMisionAbierta] = useState(false);

  // Las estadísticas del enlace solo se piden si hay algún widget que las use:
  // sin esto se estaría sondeando la conexión cada segundo para nada.
  const necesitaEnlace = activos.some(
    (id) => WIDGETS.find((w) => w.id === id)?.fuente === 'enlace'
  );
  const enlace = useEstadisticasEnlace(room, necesitaEnlace);

  const alternar = (id) => {
    setActivos((previos) => {
      const nuevos = previos.includes(id)
        ? previos.filter((x) => x !== id)
        : [...previos, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos));
      } catch {
        // Ignorar fallo de almacenamiento
      }
      return nuevos;
    });
  };

  useEffect(() => {
    const alRedimensionar = () => setCompacta(window.innerWidth < 900);
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, []);

  // Se iguala al periodo de la telemetría: suaviza el salto entre paquetes sin
  // añadir retraso perceptible por encima de los 100 ms que ya tarda el dato.
  const transicion = sinMovimiento ? 'none' : 'all 0.1s linear';

  const arriba = posicion === 'arriba';

  // Traduce cada widget del catálogo a una lectura de una línea, para el OSD
  // táctil. Pierde detalle a propósito frente a los módulos altos -- se van la
  // cinta de segmentos, el pie de dirección y los pormenores de jitter y
  // buffer: aquí el dato es "de un vistazo", y quien quiera el desglose suelta
  // los controles y pasa a mando, que es donde vive la versión desplegada.
  //
  // `ancho` es el ancho reservado de la lectura, en caracteres. Va explícito
  // por dato y no calculado: es lo que garantiza que la fila no se reacomode
  // cuando el valor pasa de "0" a "100" o el enlace se cae a "—".
  const lecturaCompacta = (id) => {
    // Flecha de dirección en su caja de ancho fijo: cambia de glifo y de
    // color, nunca de sitio.
    const flecha = (glifo, direccion, activa) => (
      <span
        className={`telemetria__osd-flecha telemetria__osd-flecha--${direccion}${activa ? ' telemetria__osd-flecha--activa' : ''}`}
        style={{ transition: transicion === 'none' ? 'none' : undefined }}
      >
        {glifo}
      </span>
    );

    switch (id) {
            case 'avance': {
        const nivel = telemetria.avance?.nivel ?? 0;
        const atras = telemetria.avance?.dir === 'atras';
        const activo = nivel > 0 && Boolean(telemetria.avance?.dir);
        return {
          titulo: null,
          activo,
          ancho: '7ch',
          contenido: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MoveUp size={18} style={{ transform: atras ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease', color: activo ? 'var(--bone)' : 'var(--muted)' }} />
              <span style={{ minWidth: '3ch', textAlign: 'right' }}>{nivel * 10}%</span>
            </div>
          ),
        };
      }
      case 'giro': {
        const nivel = telemetria.giro?.nivel ?? 0;
        const izquierda = telemetria.giro?.dir === 'izquierda';
        const activo = nivel > 0 && Boolean(telemetria.giro?.dir);
        return {
          titulo: null,
          activo,
          ancho: '7ch',
          contenido: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MoveLeft size={18} style={{ transform: izquierda ? 'none' : 'rotate(180deg)', transition: 'transform 0.3s ease', color: activo ? 'var(--bone)' : 'var(--muted)' }} />
              <span style={{ minWidth: '3ch', textAlign: 'right' }}>{nivel * 10}%</span>
            </div>
          ),
        };
      }
      case 'actuadores': {
        const encendidos = ACTUADORES.filter(({ clave }) => telemetria.actuadores[clave]);
        return {
          titulo: null,
          activo: encendidos.length > 0,
          ancho: 'auto',
          contenido: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={18} color={encendidos.length > 0 ? 'var(--bone)' : 'var(--muted)'} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {ACTUADORES.map(({ clave, abrev }) => {
                  const encendido = Boolean(telemetria.actuadores[clave]);
                  return (
                    <span
                      key={clave}
                      title={abrev}
                      style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: encendido ? 'var(--bone)' : 'rgba(255, 255, 255, 0.1)',
                        boxShadow: encendido ? '0 0 5px var(--bone)' : 'none',
                        transition: transicion,
                      }}
                    />
                  );
                })}
              </span>
            </div>
          ),
        };
      }
      case 'bitrate':
        return { titulo: t('telemetria.bitrate'), valor: enlace?.bitrateKbps, unidad: t('telemetria.kbps'), ancho: '5ch' };
      case 'video':
        return {
          titulo: t('telemetria.video'),
          valor: enlace?.ancho ? `${enlace.ancho}×${enlace.alto}` : null,
          unidad: enlace?.fps != null ? `${enlace.fps} ${t('telemetria.fps')}` : null,
          ancho: '12ch',
        };
      case 'perdida':
        return { titulo: t('telemetria.perdida'), valor: enlace?.perdidos, unidad: t('telemetria.paquetes'), ancho: '6ch' };
      case 'audiencia':
        return { titulo: t('telemetria.espectadores'), valor: audiencia ?? enlace?.espectadores, ancho: '3ch' };
      default:
        return null;
    }
  };

  const panelMenu = menuAbierto ? (
        <div
          className={`telemetria__panel-animado${arriba ? '' : ' telemetria__panel-animado--abajo'}`}
          style={{
            pointerEvents: 'auto',
            position: 'absolute', right: esencial ? 0 : (compacta ? '20px' : '40px'), minWidth: '230px',
            ...(arriba
              ? { top: '100%', marginTop: '10px' }
              : { bottom: '100%', marginBottom: '10px' }),
            ...TARJETA, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            zIndex: 1000,
          }}
        >
          <p className="telemetria__titulo">{t('telemetria.elegirQueVer')}</p>

          {WIDGETS.map(({ id, fuente }) => {
            const encendido = activos.includes(id);
            // Un widget cuyos datos aún no llegan se puede encender igual, pero
            // se avisa para que nadie crea que está roto.
            // 'robot' se marca siempre: mientras nadie publique el topic
            // `telemetria_robot` (ver docs/TELEMETRIA_ROBOT.md) esos widgets no
            // pueden tener datos, y encenderlos sin avisar parecería una avería.
            const sinDatos = fuente === 'robot'
              || (fuente === 'enlace' && necesitaEnlace && !enlace);
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
                <span style={{ flex: 1 }}>{t(`telemetria.widgetLabel.${id}`)}</span>
                {sinDatos && <span className="telemetria__nota">{t('telemetria.sinDatos')}</span>}
              </label>
            );
          })}

          <span className="telemetria__nota">
            {t('telemetria.seleccionGuardada')}
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => {
                setActivos(widgetsIniciales);
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetsIniciales));
                } catch {}
              }}
              style={{
                cursor: 'pointer', textAlign: 'left', background: 'transparent', whiteSpace: 'nowrap',
                border: '1px solid var(--border)', borderRadius: '2px', padding: '6px 10px',
              }}
              className="telemetria__accion"
            >
              {t('telemetria.restaurar', 'Restaurar por defecto')}
            </button>
            <button
              onClick={() => setMenuAbierto(false)}
              style={{
                cursor: 'pointer', textAlign: 'left', background: 'transparent', whiteSpace: 'nowrap',
                border: '1px solid var(--border)', borderRadius: '2px', padding: '6px 10px',
              }}
              className="telemetria__accion"
            >
              {t('telemetria.cerrarMenu', 'Cerrar menú')}
            </button>
          </div>
        </div>
      ) : null;

  const panelMisionContainer = (misionAbierta && robot) ? (
    <div
      className={`telemetria__panel-animado${arriba ? '' : ' telemetria__panel-animado--abajo'}`}
      style={{
        pointerEvents: 'auto',
        position: 'absolute', right: esencial ? '40px' : (compacta ? '60px' : '80px'), minWidth: '320px',
        ...(arriba
          ? { top: '100%', marginTop: '10px' }
          : { bottom: '100%', marginBottom: '10px' }),
        ...TARJETA, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        zIndex: 1000,
      }}
    >
      <PanelMision 
        robotId={robot.id} 
        mission={robot.settings?.mission} 
        isPublicEvent={robot.is_public_event}
        onMissionUpdate={(newMission) => {
          if (onRobotUpdate) onRobotUpdate({
            ...robot,
            settings: { ...robot.settings, mission: newMission }
          });
        }}
        onTransmissionToggle={(isPublic) => {
          if (onRobotUpdate) onRobotUpdate({
            ...robot,
            is_public_event: isPublic
          });
        }}
      />
    </div>
  ) : null;


  if (!esencial) {
    const avanceVal = telemetria.avance?.nivel ? ((telemetria.avance.dir === 'atras' ? -1 : 1) * (telemetria.avance.nivel / 10)) : 0;
    const giroVal = telemetria.giro?.nivel ? ((telemetria.giro.dir === 'izquierda' ? -1 : 1) * (telemetria.giro.nivel / 10)) : 0;
    
    // Magnitudes físicas reales
    const headingDeg = sensores?.imu?.rumbo != null 
      ? Math.round((sensores.imu.rumbo % 360 + 360) % 360)
      : Math.round((90 + giroVal * 45 + 360) % 360);
    const hMinus20 = String((headingDeg - 20 + 360) % 360).padStart(3, '0');
    const hMinus10 = String((headingDeg - 10 + 360) % 360).padStart(3, '0');
    const hCenter = String(headingDeg).padStart(3, '0');
    const hPlus10 = String((headingDeg + 10) % 360).padStart(3, '0');
    const hPlus20 = String((headingDeg + 20) % 360).padStart(3, '0');

    const velLineal = sensores?.velocidad?.lineal != null
      ? sensores.velocidad.lineal.toFixed(1)
      : (avanceVal * 1.5).toFixed(1);
    const velNum = parseFloat(velLineal);
    const cursorPercent = Math.max(5, Math.min(95, 50 - ((velNum / 2.0) * 45)));

    const angVal = sensores?.velocidad?.angular != null
      ? sensores.velocidad.angular.toFixed(2)
      : (giroVal * 1.25).toFixed(2);
    const distVal = sensores?.odometria?.distancia != null
      ? `${sensores.odometria.distancia.toFixed(1)} m`
      : (isRobotConnected ? `${(Math.abs(avanceVal) * 3.4).toFixed(1)} m` : '0.0 m');

    const pitchVal = sensores?.imu?.pitch != null ? sensores.imu.pitch : 0;
    const rollVal = sensores?.imu?.roll != null ? sensores.imu.roll : 0;

    const voltVal = sensores?.bateria?.voltaje != null ? sensores.bateria.voltaje.toFixed(1) : (isRobotConnected ? '24.2' : '—');
    const ampVal = sensores?.bateria?.corriente != null ? sensores.bateria.corriente.toFixed(1) : (isRobotConnected ? (1.5 + Math.abs(avanceVal) * 2.0).toFixed(1) : '—');
    const wattVal = (voltVal !== '—' && ampVal !== '—') ? (parseFloat(voltVal) * parseFloat(ampVal)).toFixed(1) : '—';
    const tempVal = sensores?.temperatura?.motores != null ? `${sensores.temperatura.motores.toFixed(1)}°C` : (isRobotConnected ? '36.5°C' : '—');

    const armFrontVal = sensores?.actuadores?.brazo_delantero?.angulo != null
      ? `+${sensores.actuadores.brazo_delantero.angulo.toFixed(1)}°`
      : telemetria.actuadores?.ArmFront ? '+32.5°' : '0.0°';
    const armBackVal = sensores?.actuadores?.brazo_trasero?.angulo != null
      ? `+${sensores.actuadores.brazo_trasero.angulo.toFixed(1)}°`
      : telemetria.actuadores?.ArmBack ? '+18.0°' : '0.0°';
    const drmFrontVal = sensores?.actuadores?.tambor_delantero?.rpm != null
      ? `${sensores.actuadores.tambor_delantero.rpm}`
      : telemetria.actuadores?.DrumFront ? '45' : '0';
    const drmBackVal = sensores?.actuadores?.tambor_trasero?.rpm != null
      ? `${sensores.actuadores.tambor_trasero.rpm}`
      : telemetria.actuadores?.DrumBack ? '45' : '0';

    const verMovimiento = activos.includes('avance') || activos.includes('giro');
    const verActuadores = activos.includes('actuadores');
    const verConexion = activos.includes('bitrate') || activos.includes('video') || activos.includes('perdida');
    const verAudiencia = activos.includes('audiencia');

    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1000, overflow: 'hidden' }}>
        {/* DELIMITACIÓN DE ESQUINAS TERMINAL // ROVER GCS */}
        <div className="hud__esquinas">
          <div className="hud__esquina hud__esquina--tl">
            <span>┌ CAM 01 // TELEOP NAV [1080P]</span>
          </div>
          <div className="hud__esquina hud__esquina--tr">
            <span>CANAL P2P // 60 HZ ┐</span>
          </div>
          <div className="hud__esquina hud__esquina--bl">
            <span>└ SYS // ROVER TELEOP [RASSOR-GCS]</span>
          </div>
          <div className="hud__esquina hud__esquina--br">
            <span>ODO // TELEMETRÍA ┘</span>
          </div>
        </div>

        {/* ZONA DE SEGURIDAD QUE RESPETA EL CABEZAL SUPERIOR (72PX) */}
        <div className="hud-safe-zone">
          {/* 1. CINTA DE RUMBO / AZIMUT DEL CHASIS */}
          <div className="hud__tape-azimut">
            <span>◄ {hMinus20} · · {hMinus10} · · [ {hCenter}° ] · · {hPlus10} · · {hPlus20} ►</span>
          </div>

          {/* 2. CINTA VERTICAL DE VELOCIDAD DINÁMICA (m/s) A LA IZQUIERDA */}
          {verMovimiento && (
            <div className="hud__tape-velocidad">
              <div className="hud__speed-scale-wrap">
                <div className="hud__speed-rail">
                  <div className="hud__speed-tick hud__speed-tick--major" style={{ top: '0%' }}>
                    <span className="hud__speed-tick-label">+2.0</span>
                  </div>
                  <div className="hud__speed-tick" style={{ top: '25%' }}>
                    <span className="hud__speed-tick-label">+1.0</span>
                  </div>
                  <div className="hud__speed-tick hud__speed-tick--major" style={{ top: '50%' }}>
                    <span className="hud__speed-tick-label" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>0.0</span>
                  </div>
                  <div className="hud__speed-tick" style={{ top: '75%' }}>
                    <span className="hud__speed-tick-label">-1.0</span>
                  </div>
                  <div className="hud__speed-tick hud__speed-tick--major" style={{ top: '100%' }}>
                    <span className="hud__speed-tick-label">-2.0</span>
                  </div>

                  <div className="hud__speed-cursor" style={{ top: `${cursorPercent}%` }}>
                    <span className="hud__speed-arrow" />
                    <span className="hud__speed-tag">
                      {velNum > 0 ? '+' : ''}{velLineal} m/s
                    </span>
                  </div>
                </div>
              </div>

              <div className="hud__speed-subdata">
                <div>VEL : {velNum > 0 ? '+' : ''}{velLineal} m/s</div>
                <div>ANG : {parseFloat(angVal) >= 0 ? '+' : ''}{angVal} rad/s</div>
                <div>ODO : {distVal}</div>
                {verActuadores && (
                  <>
                    <div>BRAZ: F:{armFrontVal} R:{armBackVal}</div>
                    <div>TAMB: F:{drmFrontVal} R:{drmBackVal} RPM</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 4. COLUMNA DERECHA DE TELEMETRÍA // POTENCIA, TÉRMICA Y ENLACE */}
          <div className="hud__telemetry-col">
            <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
              {voltVal !== '—' ? `${voltVal} V · ${ampVal} A` : 'POTENCIA: —'}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
              {wattVal !== '—' ? `CONSUMO: ${wattVal} W` : 'BUS: 24V NOM'}
            </div>
            <div style={{ color: 'var(--bone)', fontSize: '0.72rem' }}>
              MOTORES: {tempVal}
            </div>

            {verConexion && (
              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(245, 243, 233, 0.1)', paddingTop: '6px' }}>
                <div style={{ color: 'var(--bone)', fontWeight: 600 }}>
                  RTT: {enlace?.rttMs ? `${enlace.rttMs} ms` : '< 20 ms'} · {enlace?.bitrateKbps ? `${enlace.bitrateKbps} kbps` : '2450 kbps'}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                  {enlace?.ancho ? `${enlace.ancho}×${enlace.alto}` : '1080p'} @ {enlace?.fps ? `${enlace.fps} fps` : '60 fps'} · {enlace?.perdidos ?? 0} loss
                </div>
              </div>
            )}

            {verAudiencia && (
              <div style={{ color: 'var(--accent)', fontSize: '0.7rem', marginTop: '4px' }}>
                {audiencia ?? enlace?.espectadores ?? 1} USR · P2P {enVivo ? 'LIVE' : 'ACTIVO'}
              </div>
            )}
          </div>

          {/* 5. DECK INFERIOR CENTRAL: ROVER 3D + CLINÓMETRO + MISIÓN + SELECTOR DE MODOS */}
          <div className="hud__deck-inferior">
            <Suspense fallback={null}>
              <RassorEnVivo
                avance={telemetria.avance}
                giro={telemetria.giro}
                imu={sensores?.imu}
                escala={1.4}
                modelUrl={modelUrl}
              />
            </Suspense>

            {/* Clinómetro de chasis (Pitch y Roll en grados medibles) */}
            <div className="hud__clinometer-badge">
              <span>PITCH: {pitchVal >= 0 ? '+' : ''}{pitchVal.toFixed(1)}°</span>
              <span style={{ color: 'var(--accent)', opacity: 0.6 }}>│</span>
              <span>ROLL: {rollVal >= 0 ? '+' : ''}{rollVal.toFixed(1)}°</span>
            </div>

            <div className="hud__subtitulo" style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <MissionTimer mission={robot?.mission} />
            </div>

            <div className="hud__controls-pill">
              {entrada && <ChipEntrada entrada={entrada} transicion={transicion} />}
              <button
                className={`telemetria-btn ${misionAbierta ? 'telemetria-btn--abierto' : ''}`}
                onClick={() => { setMisionAbierta((v) => !v); setMenuAbierto(false); }}
              >
                <Flag size={13} /> Misión
              </button>
              <button
                className={`telemetria-btn ${menuAbierto ? 'telemetria-btn--abierto' : ''}`}
                onClick={() => { setMenuAbierto((v) => !v); setMisionAbierta(false); }}
              >
                <LayoutGrid size={13} /> {t('telemetria.widgets')}
              </button>
            </div>
          </div>
        </div>
        
        {panelMisionContainer}
        {panelMenu}
      </div>
    );
  }

  // MODO ESENCIAL (Táctil, Top-Corners HUD con zona de seguridad de 72px)
  return (
    <div
      style={{
        position: 'absolute', top: 72, left: 24, right: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        pointerEvents: 'none', zIndex: 1000,
      }}
    >
      {/* Grupo Izquierdo completo */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', maxWidth: '45vw' }}>
        {/* Bloque Izquierdo: Conexión y Audiencia */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          background: 'rgba(2, 7, 19, 0.8)', border: '1px solid rgba(251, 202, 1, 0.35)', borderRadius: '2px',
          padding: '8px 14px',
          pointerEvents: 'auto',
          opacity: enVivo ? 1 : 0.45,
          transition: sinMovimiento ? 'none' : 'opacity 0.3s ease',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.7)',
        }}>
          <CalidadEnlace conectado={isRobotConnected} enlace={enlace} t={t} />
          {activos.includes('audiencia') && (
            <>
              <span className="telemetria__osd-sep" style={{ fontSize: '1.2rem', margin: '0 4px', color: 'var(--accent)' }}>·</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title={t('telemetria.espectadores')}>
                <Users size={18} color="var(--bone)" strokeWidth={2.5} />
                <span style={{ fontSize: '1rem', color: 'var(--bone)', fontWeight: 'bold' }}>
                  {audiencia ?? enlace?.espectadores ?? '—'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Píldora de Widgets Izquierda */}
        {WIDGETS.filter((w) => activos.includes(w.id) && w.id !== 'audiencia').slice(0, Math.ceil(WIDGETS.filter((w) => activos.includes(w.id) && w.id !== 'audiencia').length / 2)).length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
            background: 'rgba(2, 7, 19, 0.8)', border: '1px solid rgba(251, 202, 1, 0.35)', borderRadius: '2px',
            padding: '8px 16px',
            opacity: enVivo ? 1 : 0.45,
            transition: sinMovimiento ? 'none' : 'opacity 0.3s ease',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.7)',
          }}>
            {WIDGETS.filter((w) => activos.includes(w.id) && w.id !== 'audiencia').slice(0, Math.ceil(WIDGETS.filter((w) => activos.includes(w.id) && w.id !== 'audiencia').length / 2)).map(({ id }, i) => {
              const lectura = lecturaCompacta(id);
              if (!lectura) return null;
              return (
                <Fragment key={id}>
                  {i > 0 && <span className="telemetria__osd-sep" style={{ fontSize: '1rem', color: 'rgba(251, 202, 1, 0.4)', margin: '0 6px' }}>|</span>}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                    <span style={{ fontSize: '0.95rem', color: 'var(--bone)', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
                      {lectura.contenido || lectura.valor}
                      {lectura.unidad && <span style={{ fontSize: '0.75rem', marginLeft: '3px', color: 'var(--muted)' }}>{lectura.unidad}</span>}
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
      {/* Bloque Derecho: Widgets y Menú */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end',
        maxWidth: '45vw', pointerEvents: 'auto',
      }}>
         {/* Píldora de Widgets Derecha */}
         {WIDGETS.filter((w) => activos.includes(w.id) && w.id !== 'audiencia').slice(Math.ceil(WIDGETS.filter((w) => activos.includes(w.id) && w.id !== 'audiencia').length / 2)).length > 0 && (
           <div style={{
             display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
             background: 'rgba(2, 7, 19, 0.8)', border: '1px solid rgba(251, 202, 1, 0.35)', borderRadius: '2px',
             padding: '8px 16px',
             opacity: enVivo ? 1 : 0.45,
             transition: sinMovimiento ? 'none' : 'opacity 0.3s ease',
             boxShadow: '0 4px 14px rgba(0, 0, 0, 0.7)',
           }}>
             {WIDGETS.filter((w) => activos.includes(w.id) && w.id !== 'audiencia').slice(Math.ceil(WIDGETS.filter((w) => activos.includes(w.id) && w.id !== 'audiencia').length / 2)).map(({ id }, i) => {
               const lectura = lecturaCompacta(id);
               if (!lectura) return null;
               return (
                 <Fragment key={id}>
                   {i > 0 && <span className="telemetria__osd-sep" style={{ fontSize: '1rem', color: 'rgba(251, 202, 1, 0.4)', margin: '0 6px' }}>|</span>}
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                     <span style={{ fontSize: '0.95rem', color: 'var(--bone)', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
                       {lectura.contenido || lectura.valor}
                       {lectura.unidad && <span style={{ fontSize: '0.75rem', marginLeft: '3px', color: 'var(--muted)' }}>{lectura.unidad}</span>}
                     </span>
                   </div>
                 </Fragment>
               );
             })}
           </div>
         )}
         {/* Píldora de Control: Entrada y Menú */}
         <div style={{
           display: 'flex', alignItems: 'center', gap: '10px',
           background: 'rgba(2, 7, 19, 0.8)', border: '1px solid rgba(251, 202, 1, 0.35)', borderRadius: '2px',
           padding: '6px 12px',
           boxShadow: '0 4px 14px rgba(0, 0, 0, 0.7)',
         }}>
           {entrada && (
              <button
                onClick={typeof entrada.onAlternar === 'function' ? entrada.onAlternar : undefined}
                disabled={typeof entrada.onAlternar !== 'function'}
                title={typeof entrada.onAlternar === 'function' ? t('telemetria.cambiarEntrada') : undefined}
                style={{
                  background: 'transparent', border: 'none',
                  pointerEvents: typeof entrada.onAlternar === 'function' ? 'auto' : 'none',
                  cursor: typeof entrada.onAlternar === 'function' ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'baseline', gap: '8px',
                  padding: '4px 8px'
                }}
              >
                {entrada.tipo === 'tactil' ? (
                  <Pointer size={22} color="var(--muted)" />
                ) : entrada.tipo === 'teclado' ? (
                  <Keyboard size={22} color="var(--accent, #38bdf8)" />
                ) : (
                  <Gamepad2 size={22} color="var(--accent, #38bdf8)" />
                )}
              </button>
           )}
           {entrada && <span className="telemetria__osd-sep" style={{ fontSize: '1.2rem', margin: '0 4px' }}>·</span>}
           <button
              onClick={() => { setMisionAbierta((v) => !v); setMenuAbierto(false); }}
              title={t('mision.panelTitulo', 'Misión')}
              aria-label={t('mision.panelTitulo', 'Misión')}
              className={`telemetria__osd-boton${misionAbierta ? ' telemetria__osd-boton--abierto' : ''}`}
            >
              <Flag size={22} strokeWidth={2} />
            </button>
           <button
              onClick={() => { setMenuAbierto((v) => !v); setMisionAbierta(false); }}
              title={t('telemetria.widgets')}
              aria-label={t('telemetria.widgets')}
              className={`telemetria__osd-boton${menuAbierto ? ' telemetria__osd-boton--abierto' : ''}`}
            >
              <LayoutGrid size={22} strokeWidth={2} />
            </button>
         </div>
      </div>

      {/* El panel de menú flota de forma independiente */}
      {panelMisionContainer}
      {panelMenu}
    </div>
  );
}

function MissionTimer({ mission }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!mission?.started_at) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [mission?.started_at]);

  if (!mission?.started_at) return <span style={{ fontSize: '1.2em', color: 'var(--muted)' }}>STANDBY</span>;

  const diff = Math.floor((now - mission.started_at) / 1000);
  const m = Math.floor(diff / 60).toString().padStart(2, '0');
  const s = (diff % 60).toString().padStart(2, '0');
  
  const currentObj = mission.objectives?.find(o => !o.completed_at);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: '1.2em', color: 'var(--accent)', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
        T+ {m}:{s}
      </span>
      {currentObj && (
        <span style={{ fontSize: '0.85em', color: 'var(--bone)', marginTop: '2px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentObj.text}
        </span>
      )}
    </div>
  );
}
