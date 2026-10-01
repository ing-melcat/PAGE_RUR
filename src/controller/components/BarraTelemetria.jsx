import { Fragment, Suspense, lazy, useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { ACTUADORES, NIVEL_MAX } from '../telemetria';
import { useTelemetria, useSinMovimiento } from '../useTelemetria';
import { useTelemetriaRobot } from '../useTelemetriaRobot';
import { WIDGETS, WIDGETS_POR_DEFECTO } from '../widgets';
import { useEstadisticasEnlace } from '../useEstadisticasEnlace';
import { useLanguage } from '../../lib/i18n';
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
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '14px' }}>
        {[0, 1, 2, 3].map(i => {
          const height = 5 + (i * 3);
          const active = quality > i;
          let color = 'var(--accent)';
          if (!active) {
            color = conectado ? 'var(--border)' : 'var(--error)';
          } else if (quality <= 1) {
            color = 'var(--error)';
          }
          return (
            <div key={i} style={{
              width: '4px',
              height: `${height}px`,
              background: color,
              borderRadius: '1px',
              transition: 'background 0.3s, opacity 0.3s',
              opacity: active ? 1 : 0.3,
              boxShadow: active && quality > 1 ? '0 0 5px var(--accent)' : 'none'
            }} />
          )
        })}
      </div>
      {!conectado && (
        <span style={{ color: 'var(--error)', fontSize: '1rem', fontWeight: 'bold', lineHeight: 1 }}>×</span>
      )}
    </div>
  );
}

const TARJETA = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '2px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
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
  calidad: 'conexion',
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
  const { modo, activo, onAlternar } = entrada;
  const pulsable = typeof onAlternar === 'function';

  return (
    <button
      onClick={pulsable ? onAlternar : undefined}
      disabled={!pulsable}
      title={pulsable ? t('telemetria.cambiarEntrada') : undefined}
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
      <span className="telemetria__titulo telemetria__titulo--inline">
        {pulsable 
          ? (entrada.esTactil ? t('telemetria.volverTeclado', 'Volver a teclado') : t('telemetria.volverTactil', 'Volver a táctil')) 
          : t('telemetria.entrada')}
      </span>
      {pulsable && entrada.atajo && (
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-ibm-mono)' }}>{entrada.atajo}</span>
      )}
      {!pulsable && (
        <span className="telemetria__valor telemetria__valor--medio" style={{ textTransform: 'uppercase' }}>
          {modo}
        </span>
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
  isRobotConnected, modelUrl,
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
  // Sin persistencia: el espectador público no tiene cuenta, así que no hay
  // dónde guardar esto salvo el navegador — y aquí no se guarda nada en el
  // navegador. El tablero vuelve a los widgets por defecto en cada visita.
  const [activos, setActivos] = useState(widgetsIniciales);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Las estadísticas del enlace solo se piden si hay algún widget que las use:
  // sin esto se estaría sondeando la conexión cada segundo para nada.
  const necesitaEnlace = activos.some(
    (id) => WIDGETS.find((w) => w.id === id)?.fuente === 'enlace'
  );
  const enlace = useEstadisticasEnlace(room, necesitaEnlace);

  const alternar = (id) => {
    setActivos((previos) =>
      previos.includes(id) ? previos.filter((x) => x !== id) : [...previos, id]
    );
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
          titulo: t('telemetria.avance'),
          activo,
          ancho: '7ch',
          contenido: <>{flecha(atras ? '▼' : '▲', atras ? 'abajo' : 'arriba', activo)} {nivel * 10}%</>,
        };
      }
      case 'giro': {
        const nivel = telemetria.giro?.nivel ?? 0;
        const izquierda = telemetria.giro?.dir === 'izquierda';
        const activo = nivel > 0 && Boolean(telemetria.giro?.dir);
        return {
          titulo: t('telemetria.giro'),
          activo,
          ancho: '7ch',
          contenido: <>{flecha(izquierda ? '◀' : '▶', izquierda ? 'izquierda' : 'derecha', activo)} {nivel * 10}%</>,
        };
      }
      case 'actuadores': {
        // Un punto por actuador, siempre los cuatro y siempre en el orden del
        // catálogo -- el mismo que el de los botones en pantalla. Las
        // abreviaturas completas (BRZ-D, TMB-T...) son 23 caracteres: en una
        // franja de teléfono se comen el resto de las lecturas, y aquí el
        // operador ya tiene los botones debajo del pulgar para saber cuál
        // está tocando. El desglose con nombres sigue estando en modo mando.
        const encendidos = ACTUADORES.filter(({ clave }) => telemetria.actuadores[clave]);
        return {
          titulo: t('telemetria.actuadores'),
          activo: encendidos.length > 0,
          ancho: 'auto',
          contenido: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              {ACTUADORES.map(({ clave, abrev }) => {
                const encendido = Boolean(telemetria.actuadores[clave]);
                return (
                  <span
                    key={clave}
                    title={abrev}
                    style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: encendido ? 'var(--bone)' : APAGADO,
                      boxShadow: encendido ? BRILLO_ACTIVO : 'none',
                      transition: transicion,
                    }}
                  />
                );
              })}
            </span>
          ),
        };
      }
      case 'calidad':
        return { titulo: t('telemetria.enlace'), valor: enlace?.calidad, ancho: '4ch' };
      case 'bitrate':
        return { titulo: t('telemetria.bitrate'), valor: enlace?.bitrateKbps, unidad: t('telemetria.kbps'), ancho: '5ch' };
      case 'video':
        return { titulo: t('telemetria.video'), valor: enlace?.ancho ? `${enlace.ancho}×${enlace.alto}` : null, ancho: '9ch' };
      case 'perdida':
        return { titulo: t('telemetria.perdida'), valor: enlace?.perdidos, ancho: '4ch' };
      case 'audiencia':
        return { titulo: t('telemetria.espectadores'), valor: audiencia ?? enlace?.espectadores, ancho: '3ch' };
      default:
        return null;
    }
  };

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
                localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetsIniciales));
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

  if (!esencial) {
    return (
      <div className="hud" style={{
        pointerEvents: 'none',
        opacity: enVivo ? 1 : 0.45,
        transition: sinMovimiento ? 'none' : 'opacity 0.3s ease',
        /* Posicionamiento extra sobre el de la clase .hud */
        ...(arriba ? { top: margen, bottom: 'auto' } : { bottom: margen })
      }}>
        {/* GRUPO IZQUIERDO: movimiento y actuadores */}
        <div className="hud__grupo" style={{ flex: 1, justifyContent: 'flex-start' }}>
          {activos.includes('avance') && (() => {
            const nivel = telemetria.avance?.nivel ?? 0;
            const activo = nivel > 0 && Boolean(telemetria.avance?.dir);
            const chevron = telemetria.avance?.dir === 'atras' ? '▼' : '▲';
            return (
              <div className="hud__medidor">
                <span className="hud__etiqueta">{t('telemetria.avance')}</span>
                <div className="hud__cuerpo">
                  <span className={`hud__cifra${activo ? '' : ' hud__cifra--apagada'}`} style={{ transition: transicion }}>
                    {activo ? chevron : ''} {nivel * 10}
                  </span>
                </div>
                <span className="hud__unidad">%</span>
              </div>
            );
          })()}
          {activos.includes('giro') && (() => {
            const nivel = telemetria.giro?.nivel ?? 0;
            const activo = nivel > 0 && Boolean(telemetria.giro?.dir);
            const signo = telemetria.giro?.dir === 'izquierda' ? '◀' : '▶';
            return (
              <div className="hud__medidor">
                <span className="hud__etiqueta">{t('telemetria.giro')}</span>
                <div className="hud__cuerpo">
                  <span className={`hud__cifra${activo ? '' : ' hud__cifra--apagada'}`} style={{ transition: transicion }}>
                    {activo ? signo : ''} {nivel * 10}
                  </span>
                </div>
                <span className="hud__unidad">%</span>
              </div>
            );
          })()}
          {activos.includes('actuadores') && (
            <div className="hud__actuadores">
              <span className="hud__etiqueta">{t('telemetria.actuadores')}</span>
              <div className="hud__cuerpo">
                <div className="hud__actuadores-puntos">
                  {ACTUADORES.map(({ clave, abrev }) => (
                    <span
                      key={clave}
                      title={abrev}
                      className={`hud__act-punto${telemetria.actuadores?.[clave] ? ' hud__act-punto--on' : ''}`}
                      style={{ transition: transicion }}
                    />
                  ))}
                </div>
              </div>
              <span className="hud__unidad" />
            </div>
          )}
        </div>

        {/* CENTRO: Robot 3D grande + controles */}
        <div className="hud__centro">
          <Suspense fallback={null}>
            <RassorEnVivo
              avance={telemetria.avance}
              giro={telemetria.giro}
              imu={sensores?.imu}
              escala={1.6}
              modelUrl={modelUrl}
            />
          </Suspense>
          <div className="hud__subtitulo" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2em', color: 'var(--text)' }}>RUR</span>
            <CalidadEnlace conectado={isRobotConnected} enlace={enlace} t={t} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', pointerEvents: 'auto' }}>
            {entrada && <ChipEntrada entrada={entrada} transicion={transicion} />}
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              style={{
                cursor: 'pointer', background: 'transparent',
                border: `1px solid ${menuAbierto ? 'var(--accent)' : 'var(--border)'}`,
                color: menuAbierto ? 'var(--accent)' : 'var(--muted)',
                borderRadius: '4px', padding: '4px 10px',
                textTransform: 'uppercase', fontFamily: 'var(--font-ibm-mono), monospace',
                fontSize: '0.68rem', letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <LayoutGrid size={14} /> {t('telemetria.widgets')}
            </button>
          </div>
        </div>

        {/* GRUPO DERECHO: datos REALES de conexión */}
        <div className="hud__grupo" style={{ flex: 1, justifyContent: 'flex-end' }}>
          {activos.includes('calidad') && (
            <div className="hud__medidor hud__medidor--enlace">
              <span className="hud__etiqueta">{t('telemetria.enlace')}</span>
              <div className="hud__cuerpo">
                <span className={`hud__cifra${enlace?.calidad != null ? '' : ' hud__cifra--apagada'}`}>
                  {enlace?.calidad ?? '—'}
                </span>
              </div>
              <span className="hud__senal">
                <span
                  className={`hud__punto hud__punto--${isRobotConnected ? 'vivo' : 'caido'}`}
                  style={{
                    color: isRobotConnected ? 'var(--success)' : 'var(--error)',
                    boxShadow: isRobotConnected ? '0 0 8px var(--success)' : 'none',
                  }}
                />
                {isRobotConnected ? 'CONNECTED' : 'NO SIGNAL'}
              </span>
            </div>
          )}
          {activos.includes('bitrate') && (
            <div className="hud__medidor">
              <span className="hud__etiqueta">{t('telemetria.bitrate')}</span>
              <div className="hud__cuerpo">
                <span className={`hud__cifra${enlace?.bitrateKbps != null ? '' : ' hud__cifra--apagada'}`}>
                  {enlace?.bitrateKbps ?? '—'}
                </span>
              </div>
              <span className="hud__unidad">{t('telemetria.kbps')}</span>
            </div>
          )}
          {activos.includes('video') && (
            <div className="hud__medidor">
              <span className="hud__etiqueta">{t('telemetria.video')}</span>
              <div className="hud__cuerpo">
                <span className={`hud__cifra${enlace?.ancho ? '' : ' hud__cifra--apagada'}`}>
                  {enlace?.ancho ? `${enlace.ancho}×${enlace.alto}` : '—'}
                </span>
              </div>
              <span className="hud__unidad">{enlace?.fps != null ? `${enlace.fps} fps` : ''}</span>
            </div>
          )}
          {activos.includes('perdida') && (
            <div className="hud__medidor">
              <span className="hud__etiqueta">{t('telemetria.perdida')}</span>
              <div className="hud__cuerpo">
                <span className={`hud__cifra${enlace?.perdidos != null ? '' : ' hud__cifra--apagada'}`}>
                  {enlace?.perdidos ?? '—'}
                </span>
              </div>
              <span className="hud__unidad">{t('telemetria.paquetes')}</span>
            </div>
          )}
          {activos.includes('audiencia') && (
            <div className="hud__medidor">
              <span className="hud__etiqueta">{t('telemetria.espectadores')}</span>
              <div className="hud__cuerpo">
                <span className={`hud__cifra${(audiencia ?? enlace?.espectadores) != null ? '' : ' hud__cifra--apagada'}`}>
                  {audiencia ?? enlace?.espectadores ?? '—'}
                </span>
              </div>
              <span className="hud__unidad" />
            </div>
          )}
        </div>
        
        {panelMenu}
      </div>
    );
  }

  // MODO ESENCIAL (Táctil, regleta fina)
  return (
    <div
      className="telemetria--osd"
      style={{
        position: 'absolute', zIndex: 1000,
        background: 'var(--surface)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        borderRadius: '2px',
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        pointerEvents: 'none',
        opacity: enVivo ? 1 : 0.45,
        transition: sinMovimiento ? 'none' : 'opacity 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexWrap: 'wrap', gap: '8px 4px', padding: '7px 10px',
        }}
      >
        <div className="telemetria__osd">
          {WIDGETS.filter((w) => activos.includes(w.id)).map(({ id }, i) => {
            const lectura = lecturaCompacta(id);
            if (!lectura) return null;
            return (
              <Fragment key={id}>
                {i > 0 && <span className="telemetria__osd-sep">·</span>}
                <LecturaEnLinea {...lectura} />
              </Fragment>
            );
          })}
        </div>

        <div style={{ display: 'contents' }}>
          {activos.includes('audiencia') && (
            <>
              <span className="telemetria__osd-sep">·</span>
              <div className="telemetria__osd-item">
                <span className="telemetria__osd-etiqueta">{t('telemetria.espectadores')}</span>
                <span className="telemetria__osd-valor" style={{ minWidth: '3ch' }}>{audiencia ?? enlace?.espectadores ?? '—'}</span>
              </div>
            </>
          )}
          
          {entrada && (
            <>
              <span className="telemetria__osd-sep">·</span>
              <button
                onClick={typeof entrada.onAlternar === 'function' ? entrada.onAlternar : undefined}
                disabled={typeof entrada.onAlternar !== 'function'}
                title={typeof entrada.onAlternar === 'function' ? t('telemetria.cambiarEntrada') : undefined}
                className="telemetria__osd-item"
                style={{
                  background: 'transparent', border: 'none',
                  pointerEvents: typeof entrada.onAlternar === 'function' ? 'auto' : 'none',
                  cursor: typeof entrada.onAlternar === 'function' ? 'pointer' : 'default',
                }}
              >
                <span className="telemetria__osd-etiqueta">{t('telemetria.entrada')}</span>
                <span className="telemetria__osd-valor" style={{ minWidth: '6ch' }}>{entrada.modo}</span>
              </button>
            </>
          )}

          {enVivo && (
            <>
              <span className="telemetria__osd-sep">·</span>
              <CalidadEnlace conectado={isRobotConnected} enlace={enlace} t={t} />
            </>
          )}

          <button
            onClick={() => setMenuAbierto((v) => !v)}
            title={t('telemetria.widgets')}
            aria-label={t('telemetria.widgets')}
            className={`telemetria__osd-boton${menuAbierto ? ' telemetria__osd-boton--abierto' : ''}`}
            style={{ pointerEvents: 'auto' }}
          >
            <LayoutGrid size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {panelMenu}
    </div>
  );
}
