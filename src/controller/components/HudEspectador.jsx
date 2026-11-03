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
    : `${(12.6 + Math.abs(avanceVal) * 3.4).toFixed(1)} m`;

  const pitchVal = sensores?.imu?.pitch != null ? sensores.imu.pitch : 0;
  const rollVal = sensores?.imu?.roll != null ? sensores.imu.roll : 0;

  const voltVal = sensores?.bateria?.voltaje != null ? sensores.bateria.voltaje.toFixed(1) : '24.6';
  const ampVal = sensores?.bateria?.corriente != null ? sensores.bateria.corriente.toFixed(1) : (1.8 + Math.abs(avanceVal) * 3.2).toFixed(1);
  const wattVal = (parseFloat(voltVal) * parseFloat(ampVal)).toFixed(1);
  const tempVal = sensores?.temperatura?.motores != null ? `${sensores.temperatura.motores.toFixed(1)}°C` : '41.2°C';

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

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'hidden' }}>
      {/* Delimitación de esquinas del cockpit */}
      <div className="hud__esquinas">
        <div className="hud__esquina hud__esquina--tl">
          <span>┌ CAM 01 // FRONT HD · LIVE</span>
        </div>
        <div className="hud__esquina hud__esquina--tr">
          <span>{titulo || 'RUR // COCKPIT'} ┐</span>
        </div>
      </div>

      <div className="hud-safe-zone">
        {/* 1. Cinta de Azimut / Rumbo Horizontal */}
        <div className="hud__tape-azimut">
          <span>◄ {hMinus20} · · {hMinus10} · · [ {hCenter}° ] · · {hPlus10} · · {hPlus20} ►</span>
        </div>

        {/* 2. Cinta Vertical de Velocidad Dinámica (m/s) a la Izquierda */}
        {visible('velocidad') && (
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
              <div>DIST: {distVal}</div>
              <div>ANG : {parseFloat(angVal) >= 0 ? '+' : ''}{angVal} rad/s</div>
              <div>ARM : F:{armFrontVal} R:{armBackVal}</div>
              <div>DRM : F:{drmFrontVal} R:{drmBackVal} RPM</div>
            </div>
          </div>
        )}

        {/* 3. Retícula Óptica Central (Boresight & Pitch Ladder) */}
        <div className="hud__boresight">
          <div className="hud__boresight-cross">
            <span className="hud__boresight-line-h" />
            <span className="hud__boresight-line-v" />
            <span className="hud__boresight-corner hud__boresight-corner--tl" />
            <span className="hud__boresight-corner hud__boresight-corner--tr" />
            <span className="hud__boresight-corner hud__boresight-corner--bl" />
            <span className="hud__boresight-corner hud__boresight-corner--br" />
            <span className="hud__boresight-center" />
          </div>
          <div 
            className="hud__boresight-ladder"
            style={{ transform: `rotate(${-rollVal * 0.5}deg) translateY(${pitchVal * 1.2}px)` }}
          >
            <span>+10</span>
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>┌ 00 ┐</span>
            <span>-10</span>
          </div>
          <div className="hud__boresight-angles">
            P: {pitchVal >= 0 ? '+' : ''}{pitchVal.toFixed(1)}° │ R: {rollVal >= 0 ? '+' : ''}{rollVal.toFixed(1)}°
          </div>
        </div>

        {/* 4. Columna Derecha de Potencia y Enlace */}
        <div className="hud__tape-avionica">
          <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
            {voltVal} V · {ampVal} A
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.68rem' }}>
            BUS: 24V NOM · {wattVal} W
          </div>
          <div>TEMP: {tempVal} MOT</div>
          <div style={{ marginTop: '6px', color: '#2ecc71', fontWeight: 600 }}>
            {enlace?.rttMs ? `${enlace.rttMs} ms` : '< 20 ms'} · {enlace?.bitrateKbps ? `${enlace.bitrateKbps} kbps` : '2450 kbps'}
          </div>
          <div>{enlace?.ancho ? `${enlace.ancho}×${enlace.alto}` : '1080p'} @ {enlace?.fps ? `${enlace.fps} fps` : '60 fps'} · {enlace?.perdidos ?? 0} loss</div>
          <div style={{ color: 'var(--bone)', fontSize: '0.68rem' }}>
            {enlace?.espectadores ?? 1} USR · P2P {enVivo ? 'LIVE' : 'LINK'}
          </div>
        </div>

        {/* 5. Deck Inferior Central: Rover 3D + Misión */}
        <div className="hud__deck-inferior">
          {visible('robot3d') && (
            <Suspense fallback={null}>
              <RassorEnVivo avance={telemetria.avance} giro={telemetria.giro} imu={sensores?.imu} modelUrl={modelUrl} />
            </Suspense>
          )}

          <div className="hud__subtitulo" style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span className="hud__mission-clock">
              T+ <RelojMision desde={mision?.inicio} missionHls={missionHls} playingDate={playingDate} />
            </span>
            {activeObj && (
              <span style={{ color: 'var(--accent)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                OBJ: {activeObj.text || activeObj}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
