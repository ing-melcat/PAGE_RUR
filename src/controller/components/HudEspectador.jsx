import { Suspense, lazy, useEffect, useState } from 'react';
import { ACTUADORES } from '../telemetria';
import { useTelemetria, useSinMovimiento, useMision } from '../useTelemetria';
import { useTelemetriaRobot } from '../useTelemetriaRobot';
import { Horizonte, Bateria, VelocidadReal } from './Instrumentos';

// three.js y el modelo suman varios megas: van en su propio chunk y solo se
// descargan si el widget está encendido. El espectador que entre desde el
// móvil con el 3D apagado no paga nada por él.
const RassorEnVivo = lazy(() => import('./RassorEnVivo').then((m) => ({ default: m.RassorEnVivo })));
import { useEstadisticasEnlace } from '../useEstadisticasEnlace';
import { useLanguage } from '../../lib/i18n';
import '../HudEspectador.css';

/**
 * HUD del espectador, con el lenguaje visual de una retransmisión de
 * lanzamiento: indicadores de arco a los lados, reloj de misión al centro y
 * un esquema de la máquina con sus actuadores.
 *
 * Una advertencia que conviene no perder de vista al ampliarlo: **todo lo que
 * se muestra aquí son órdenes del operador, no medidas del robot**. Un cohete
 * enseña velocidad y fuerza G porque las mide; nosotros, de momento, solo
 * sabemos cuánto empuja el joystick. Poner "45 km/h" sería inventarlo, y eso
 * en una transmisión pública se nota. Cuando el robot publique sus sensores
 * (contrato en docs/TELEMETRIA_ROBOT.md), estos mismos arcos pasan a mostrar
 * magnitudes medidas sin cambiar el diseño.
 *
 * Los indicadores son SVG y no canvas ni imágenes: se ven nítidos igual en un
 * teléfono que en una pantalla 4K, que es donde acaba una retransmisión.
 */

/**
 * Actuadores: cuatro puntos y su etiqueta.
 *
 * Es lo único que se conserva de la cruz de mando que había aquí. Aquella
 * dibujaba la planta del robot con el punto del joystick encima para contar
 * avance y giro, pero desde que el modelo 3D gira hacia donde manda el
 * operador esa lectura está duplicada — y en pantalla nadie reconocía el
 * cuadro de la izquierda.
 *
 * Los actuadores, en cambio, el 3D no puede mostrarlos: el STL del CAD es una
 * malla única, sin brazos ni tambores separables. Así que se quedan aquí, en
 * el orden del catálogo (delanteros primero).
 */
function Actuadores({ actuadores, transicion }) {
  const { t } = useLanguage();

  return (
    <div className="hud__actuadores">
      <span className="hud__etiqueta">{t('telemetria.actuadores')}</span>
      <div className="hud__cuerpo">
      <div className="hud__actuadores-puntos">
        {ACTUADORES.map(({ clave, abrev }) => (
          <span
            key={clave}
            title={abrev}
            className={`hud__act-punto${actuadores?.[clave] ? ' hud__act-punto--on' : ''}`}
            style={{ transition: transicion }}
          />
        ))}
      </div>
      </div>
      <span className="hud__unidad" />
    </div>
  );
}

const dosDigitos = (n) => String(n).padStart(2, '0');

/**
 * Reloj de misión: cuenta desde que la transmisión entra en vivo. Es el
 * equivalente honesto al T+ de un lanzamiento — no hay cuenta atrás porque no
 * hay un instante de ignición que anticipar, pero el tiempo transcurrido sí
 * es real y da la misma sensación de acontecimiento en marcha.
 */
function RelojMision({ desde, missionHls, playingDate }) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (playingDate) return;
    const id = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(id);
  }, [playingDate]);

  const startedAt = missionHls?.started_at || desde;
  if (!startedAt) {
    if (missionHls && !missionHls.started_at) {
      // Countdown or not started yet
      return <span className="hud__reloj-cifra">PRE-FLIGHT</span>;
    }
    return <span className="hud__reloj-cifra">--:--:--</span>;
  }

  const currentNow = playingDate ? playingDate.getTime() : ahora;
  const s = Math.max(0, Math.floor((currentNow - startedAt) / 1000));
  return (
    <span className="hud__reloj-cifra">
      {dosDigitos(Math.floor(s / 3600))}:{dosDigitos(Math.floor(s / 60) % 60)}:{dosDigitos(s % 60)}
    </span>
  );
}

/**
 * @param widgets  lista de datos a mostrar. Sin ella se muestran todos. La usa
 *                 la capa de OBS para componer escenas distintas con la misma
 *                 ruta (?widgets=avance,giro), sin necesidad de tocar código.
 */
export function HudEspectador({ room, titulo, widgets, simular = false, modelUrl, missionHls, playingDate }) {
  const visible = (id) => !widgets || widgets.includes(id);
  const { t } = useLanguage();
  const { telemetria, enVivo } = useTelemetria(room);
  const mision = useMision(room);
  const sensores = useTelemetriaRobot(room, simular);
  const sinMovimiento = useSinMovimiento();
  const enlace = useEstadisticasEnlace(room, true);

  const transicion = sinMovimiento ? 'none' : 'all 0.1s linear';

  // Determine active objective
  const activeObj = missionHls?.objectives?.find(o => !o.completed_at) || mision?.objetivo;

  return (
    <div className="hud">
      <div className="hud__grupo" style={{ flex: 1, justifyContent: 'flex-start' }}>
        {visible('velocidad') && <VelocidadReal velocidad={sensores?.velocidad} transicion={transicion} />}
        {visible('inclinacion') && <Horizonte imu={sensores?.imu} transicion={transicion} />}
        {visible('actuadores') && <Actuadores actuadores={telemetria.actuadores} transicion={transicion} />}
      </div>

      <div className="hud__centro">
        {visible('robot3d') && (
          <Suspense fallback={null}>
            <RassorEnVivo avance={telemetria.avance} giro={telemetria.giro} imu={sensores?.imu} modelUrl={modelUrl} />
          </Suspense>
        )}
        <div className="hud__subtitulo">
          {enVivo && !telemetria.robot && (
            <span className="hud__alerta"> · {t('telemetria.sinRobotConectado')}</span>
          )}
        </div>
        {activeObj && (
          <div className="hud__objetivo" style={{ color: 'var(--accent)', fontSize: '0.9em', marginTop: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            OBJETIVO: {activeObj.text || activeObj}
          </div>
        )}
        {/* Aquí es donde iría la línea de fases de la misión. Está fuera a
            propósito: las fases (excavación, descarga...) no se pueden deducir
            de la telemetría, hay que definirlas por evento. Pendiente de esa
            decisión de producto. */}
      </div>

      <div className="hud__grupo" style={{ flex: 1, justifyContent: 'flex-end' }}>
        {visible('bateria') && <Bateria bateria={sensores?.bateria} transicion={transicion} />}
        {visible('enlace') && (
        <div className="hud__medidor hud__medidor--enlace">
          <span className="hud__etiqueta">{t('telemetria.enlace')}</span>
          <div className="hud__cuerpo">
            <span className={`hud__cifra${enlace?.calidad != null ? '' : ' hud__cifra--apagada'}`}>
              {enlace?.calidad ?? '—'}
            </span>
          </div>
          <span className="hud__senal">
            {/* Relleno cuando hay señal, anillo hueco cuando no: el verde y el
                rojo del sitio se separan ΔE 2.2 bajo deuteranopía, así que el
                color no puede ser el único portador del estado. Aquí además va
                acompañado de su etiqueta. */}
            <span
              className={`hud__punto hud__punto--${enVivo ? 'vivo' : 'caido'}`}
              style={{
                color: enVivo ? 'var(--success)' : 'var(--error)',
                boxShadow: enVivo ? '0 0 8px var(--success)' : 'none',
              }}
            />
            {enVivo ? t('telemetria.enVivo') : t('telemetria.sinSenal')}
          </span>
        </div>
        )}
      </div>
    </div>
  );
}
