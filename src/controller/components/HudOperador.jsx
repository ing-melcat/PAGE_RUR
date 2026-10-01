import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ACTUADORES } from '../telemetria';
import { useTelemetria, useSinMovimiento } from '../useTelemetria';
import { useTelemetriaRobot } from '../useTelemetriaRobot';
import { Bateria } from './Instrumentos';
import { useEstadisticasEnlace } from '../useEstadisticasEnlace';
import { useLanguage } from '../../lib/i18n';
import { LayoutGrid } from 'lucide-react';
import { WIDGETS, WIDGETS_POR_DEFECTO } from '../widgets';
import { ChipEntrada } from './BarraTelemetria';
import '../HudEspectador.css';

const RassorEnVivo = lazy(() => import('./RassorEnVivo').then((m) => ({ default: m.RassorEnVivo })));

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

function RelojMision({ desde }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  if (!desde) return <span className="hud__reloj-cifra">--:--:--</span>;
  const s = Math.max(0, Math.floor((ahora - desde) / 1000));
  return (
    <span className="hud__reloj-cifra">
      {dosDigitos(Math.floor(s / 3600))}:{dosDigitos(Math.floor(s / 60) % 60)}:{dosDigitos(s % 60)}
    </span>
  );
}

function MedidorAvance({ avance, transicion }) {
  const { t } = useLanguage();
  const nivel = avance?.nivel ?? 0;
  const activo = nivel > 0 && Boolean(avance?.dir);
  const chevron = avance?.dir === 'atras' ? '▼' : '▲';
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
}

function MedidorGiro({ giro, transicion }) {
  const { t } = useLanguage();
  const nivel = giro?.nivel ?? 0;
  const activo = nivel > 0 && Boolean(giro?.dir);
  const signo = giro?.dir === 'izquierda' ? '◀' : '▶';
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
}

function MedidorDato({ etiqueta, valor, unidad, pieCifra }) {
  const hayDato = valor != null && valor !== '';
  return (
    <div className="hud__medidor">
      <span className="hud__etiqueta">{etiqueta}</span>
      <div className="hud__cuerpo">
        <span className={`hud__cifra${hayDato ? '' : ' hud__cifra--apagada'}`}>
          {hayDato ? valor : '—'}
        </span>
      </div>
      <span className="hud__unidad">{unidad || ''}</span>
      {pieCifra && <span className="hud__senal">{pieCifra}</span>}
    </div>
  );
}

const TARJETA = {
  background: 'rgba(15, 20, 30, 0.95)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
};

export function HudOperador({ room, fuenteLocal, modelUrl, isRobotConnected, entrada, accionesMenu = [], audiencia, tituloMision, objetivoMision, inicioMision, widgetsIniciales = WIDGETS_POR_DEFECTO }) {
  const [activos, setActivos] = useState(widgetsIniciales);
  const [menuAbierto, setMenuAbierto] = useState(false);
  
  const visible = (id) => activos.includes(id);

  const alternar = (id) => {
    setActivos((previos) =>
      previos.includes(id) ? previos.filter((x) => x !== id) : [...previos, id]
    );
  };

  const { t } = useLanguage();
  const { telemetria } = useTelemetria(room, fuenteLocal);
  const sinMovimiento = useSinMovimiento(fuenteLocal);
  const necesitaEnlace = activos.some((id) => WIDGETS.find((w) => w.id === id)?.fuente === 'enlace');
  const enlace = useEstadisticasEnlace(room, necesitaEnlace);
  const sensores = useTelemetriaRobot(room, false);

  const transicion = sinMovimiento ? 'none' : 'all 0.1s linear';
  const resolucion = enlace?.video?.ancho ? `${enlace.video.ancho}×${enlace.video.alto}` : null;
  const fps = enlace?.video?.fps ? `${enlace.video.fps} fps` : null;

  return (
    <div className="hud">
      <div className="hud__grupo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', pointerEvents: 'auto', marginRight: '10px' }}>
          {entrada && <ChipEntrada entrada={entrada} transicion={transicion} />}
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            style={{
              cursor: 'pointer', background: 'transparent', border: `1px solid ${menuAbierto ? 'var(--accent)' : 'var(--border)'}`,
              color: menuAbierto ? 'var(--accent)' : 'var(--muted)',
              borderRadius: '4px', padding: '4px 8px',
              display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase',
              fontSize: '11px', fontFamily: 'var(--font-ibm-mono), monospace'
            }}
          >
            <LayoutGrid size={14} /> WIDGETS
          </button>
        </div>
        {visible('avance') && <MedidorAvance avance={telemetria.avance} transicion={transicion} />}
        {visible('giro') && <MedidorGiro giro={telemetria.giro} transicion={transicion} />}
        {visible('actuadores') && <Actuadores actuadores={telemetria.actuadores} transicion={transicion} />}
      </div>

      <div className="hud__centro">
        {visible('robot3d') && (
          <Suspense fallback={null}>
            <RassorEnVivo avance={telemetria.avance} giro={telemetria.giro} imu={sensores?.imu} modelUrl={modelUrl} />
          </Suspense>
        )}
        <div className="hud__reloj">
          <span className="hud__reloj-signo">T+</span> <RelojMision desde={inicioMision} />
        </div>
        <div className="hud__subtitulo">
          <span style={{ fontSize: '1.2em', color: 'var(--text)' }}>{tituloMision || 'RUR'}</span>
          {!isRobotConnected && (
            <span className="hud__alerta"> · {t('telemetria.sinRobotConectado')}</span>
          )}
        </div>
        {objetivoMision && (
          <div className="hud__objetivo" style={{ color: 'var(--accent)', fontSize: '0.9em', marginTop: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            OBJETIVO: {objetivoMision}
          </div>
        )}
      </div>

      <div className="hud__grupo">
        {visible('bateria') && <Bateria bateria={sensores?.bateria} transicion={transicion} />}
        {visible('calidad') && (
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
        {visible('bitrate') && <MedidorDato etiqueta={t('telemetria.bitrate')} valor={enlace?.bitrate?.rx} unidad="kbps" />}
        {visible('video') && <MedidorDato etiqueta="VIDEO" valor={resolucion} pieCifra={fps} />}
        {visible('perdida') && <MedidorDato etiqueta={t('telemetria.perdida')} valor={enlace?.perdida?.rx} unidad="%" />}
        <MedidorDato etiqueta="VIEWERS" valor={audiencia} />
      </div>
    
      {menuAbierto && (
        <div
          style={{
            pointerEvents: 'auto',
            position: 'absolute', left: '20px', top: '100%', marginTop: '10px', minWidth: '230px',
            ...TARJETA, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 100
          }}
        >
          <p className="telemetria__titulo">{t('telemetria.elegirQueVer')}</p>
          {WIDGETS.map(({ id, fuente }) => {
            const encendido = activos.includes(id);
            const sinDatos = fuente === 'robot' || (fuente === 'enlace' && necesitaEnlace && !enlace);
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
                <span style={{ flex: 1, fontFamily: 'var(--font-ibm-mono), monospace', fontSize: '11px' }}>{t(`telemetria.widgetLabel.${id}`)}</span>
                {sinDatos && <span className="telemetria__nota">{t('telemetria.sinDatos')}</span>}
              </label>
            );
          })}
          <span className="telemetria__nota">{t('telemetria.seleccionGuardada')}</span>
          {accionesMenu.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              {accionesMenu.map(({ label, onClick }) => (
                <button
                  key={label}
                  className="telemetria__accion"
                  onClick={onClick}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
</div>
  );
}
