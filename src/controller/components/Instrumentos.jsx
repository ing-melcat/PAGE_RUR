import { useLanguage } from '../../lib/i18n';

/**
 * Instrumentos alimentados por los SENSORES del robot (no por las órdenes del
 * operador). Contrato de datos en docs/TELEMETRIA_ROBOT.md.
 *
 * Todos siguen la misma regla: **sin dato, no se dibuja el instrumento**. Un
 * horizonte artificial plano cuando no hay IMU no es un instrumento vacío —
 * afirma que el robot está nivelado. Un indicador que miente es peor que
 * ninguno, y en una transmisión pública se nota.
 *
 * Son SVG a mano y no una librería: un horizonte son cuarenta líneas, hereda
 * los colores del sitio sin adaptadores y no añade medio megabyte al bundle
 * para dibujar dos rectángulos y una escala.
 */

/**
 * Inclinación, reducida a una línea.
 *
 * Antes era un horizonte artificial completo —disco recortado, cielo, suelo y
 * escala de grados—. Se descartó por dos motivos: dentro de un HUD de 130px
 * ese disco es un objeto ajeno, con su propio marco y su propia paleta
 * compitiendo con el vídeo; y además nadie está pilotando con él, así que la
 * precisión de un instrumento de vuelo no compra nada.
 *
 * Queda lo que de verdad se lee de un vistazo: **una línea que se tuerce**.
 * Rota con el alabeo y sube o baja con el cabeceo, contra una marca central
 * fija en ámbar que representa la máquina. Plana significa nivelado; torcida,
 * en pendiente. Sin marco, sin relleno y con los colores de la interfaz.
 */
export function Horizonte({ imu, transicion }) {
  const { t } = useLanguage();
  if (!imu || imu.pitch == null || imu.roll == null) return null;

  const { pitch, roll } = imu;
  const ANCHO = 84;
  const ALTO = 34;
  const centro = ALTO / 2;

  // 0.42px por grado de cabeceo: ±30° caben dentro del alto sin que la línea
  // se salga, y más allá de eso ya no importa el valor exacto sino que está
  // muy inclinado.
  const y = centro + Math.max(-14, Math.min(14, pitch * 0.42));
  const inclinado = Math.abs(roll) > 12 || Math.abs(pitch) > 12;

  return (
    <div className="hud__medidor hud__medidor--horizonte">
      <span className="hud__etiqueta">{t('telemetria.inclinacion')}</span>
      <div className="hud__cuerpo">
      <svg width={ANCHO} height={ALTO} viewBox={`0 0 ${ANCHO} ${ALTO}`} aria-hidden="true">
        {/* Línea del terreno: lo único que se mueve */}
        <g transform={`rotate(${-roll} ${ANCHO / 2} ${centro})`} style={{ transition: transicion }}>
          <line
            x1="4" y1={y} x2={ANCHO - 4} y2={y}
            stroke={inclinado ? 'var(--warning)' : 'var(--bone)'}
            strokeWidth="2" strokeLinecap="round"
            style={{ transition: transicion }}
          />
        </g>

        {/* La máquina: fija, siempre en el centro. Dos trazos y un punto, el
            mismo signo que lleva la silueta del horizonte de un avión pero sin
            el instrumento alrededor. */}
        <line x1={ANCHO / 2 - 15} y1={centro} x2={ANCHO / 2 - 6} y2={centro}
              stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={ANCHO / 2 + 6} y1={centro} x2={ANCHO / 2 + 15} y2={centro}
              stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={ANCHO / 2} cy={centro} r="1.6" fill="var(--accent)" />
      </svg>
      </div>
      <span className="hud__pie-instrumento">
        {Math.round(pitch)}° · {Math.round(roll)}°
      </span>
    </div>
  );
}

/**
 * Batería. Es el único indicador del HUD con severidad real: quedarse sin
 * carga a media demostración es la avería más probable y la más embarazosa.
 *
 * El color va acompañado SIEMPRE del número y, por debajo del 15%, de un
 * texto. Rojo y verde se separan apenas bajo deuteranopía, así que el color
 * nunca puede ser el único portador del aviso.
 */
export function Bateria({ bateria, transicion }) {
  const { t } = useLanguage();
  if (!bateria || bateria.porcentaje == null) return null;

  const pct = Math.max(0, Math.min(100, bateria.porcentaje));
  const critico = pct <= 15;
  const bajo = pct <= 30;
  const color = critico ? 'var(--error)' : bajo ? 'var(--warning)' : 'var(--bone)';

  return (
    <div className="hud__medidor hud__medidor--bateria">
      <span className="hud__etiqueta">{t('telemetria.bateria')}</span>
      <div className="hud__cuerpo" style={{ gap: '8px' }}>
      <svg width="46" height="22" viewBox="0 0 64 30">
        <rect x="1" y="6" width="52" height="18" rx="2" fill="none" stroke="var(--border)" strokeWidth="1.5" />
        <rect x="54" y="12" width="4" height="6" rx="1" fill="var(--border)" />
        <rect
          x="4" y="9" height="12" rx="1"
          width={Math.max(0, (pct / 100) * 46)}
          fill={color}
          style={{ transition: transicion }}
        />
      </svg>
      <span className="hud__cifra-instrumento" style={{ color }}>{pct}%</span>
      </div>
      <span className={critico ? 'hud__pie-alerta' : 'hud__unidad'}>
        {critico ? t('telemetria.bateriaBaja') : ''}
      </span>
    </div>
  );
}

/**
 * Velocidad medida por los encoders. Es la lectura que de verdad dice si la
 * máquina responde: al lado del AVANCE ordenado, la diferencia entre ambos
 * delata un robot atascado, sin tracción o con un motor caído.
 */
export function VelocidadReal({ velocidad, transicion }) {
  const { t } = useLanguage();
  if (!velocidad || velocidad.lineal == null) return null;

  const v = velocidad.lineal;

  return (
    <div className="hud__medidor hud__medidor--velocidad">
      <span className="hud__etiqueta">{t('telemetria.velocidad')}</span>
      <div className="hud__cuerpo">
        <span className="hud__cifra-instrumento" style={{ transition: transicion }}>
          {Math.abs(v).toFixed(2)}
        </span>
      </div>
      <span className="hud__unidad">
        {t('telemetria.metrosPorSegundo')}
        {v < 0 && ` · ${t('telemetria.direccionAvance.atras')}`}
      </span>
    </div>
  );
}
