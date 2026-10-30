import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, ExternalLink, Radio } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import './PanelTransmision.css';

/**
 * Panel de transmisión en vivo.
 *
 * Reúne en un sitio las direcciones que hacen falta para emitir: el enlace
 * público que se le pasa a la gente, y las capas de datos que se pegan en OBS.
 *
 * Existe por una razón concreta: esas capas se configuran con parámetros en la
 * URL (?layout=…&widgets=…&escala=…). Eso es cómodo una vez que te lo sabes, y
 * un incordio cuando estás montando una escena en directo y no te acuerdas de
 * si era `widget` o `widgets`. Aquí se arma sola y se copia con un botón.
 *
 * No inventa nada nuevo: solo compone direcciones de rutas que ya existen
 * (/espectador/:id y /overlay/:id).
 */

// Los datos que puede llevar una capa. Coinciden con lo que entiende
// HudEspectador; añadir uno aquí sin añadirlo allí solo produce un hueco.
const DATOS = [
  { id: 'avance', etiqueta: 'AVANCE' },
  { id: 'giro', etiqueta: 'GIRO' },
  { id: 'actuadores', etiqueta: 'ACTUADORES' },
  { id: 'enlace', etiqueta: 'ENLACE' },
  // Estos tres solo tienen dato cuando el robot publique sus sensores
  // (docs/TELEMETRIA_ROBOT.md). Hasta entonces el instrumento no se dibuja,
  // así que marcarlos no rompe nada: simplemente no aparecen.
  { id: 'velocidad', etiqueta: 'VELOCIDAD' },
  { id: 'bateria', etiqueta: 'BATERÍA' },
  { id: 'inclinacion', etiqueta: 'INCLINACIÓN' },
  // El 3D arrastra three.js y 6 MB de modelo: en una escena de OBS luce, pero
  // conviene apagarlo si la máquina que produce va justa.
  { id: 'robot3d', etiqueta: 'ROBOT 3D' },
];

/**
 * @param urlPrevia  variante de la dirección para abrir en una pestaña. Se usa
 *                   para las capas de OBS: la que se COPIA va limpia y
 *                   transparente, como la necesita OBS; la que se ABRE lleva
 *                   un fondo simulado, porque sobre el blanco del navegador el
 *                   texto hueso no se ve.
 */
function Direccion({ url, urlPrevia, nota }) {
  const { t } = useLanguage();
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      // Sin permiso de portapapeles (o sin HTTPS): el campo es seleccionable,
      // así que siempre queda el copiado a mano. Mejor eso que un error.
      setCopiado(false);
    }
  };

  return (
    <div className="tx-direccion">
      <input className="tx-direccion__url" value={url} readOnly onFocus={(e) => e.target.select()} />
      <button className="tx-direccion__boton" onClick={copiar} title={t('transmision.copiar')}>
        {copiado ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <a className="tx-direccion__boton" href={urlPrevia || url} target="_blank" rel="noreferrer" title={t('transmision.abrir')}>
        <ExternalLink size={16} />
      </a>
      {nota && <p className="tx-nota">{nota}</p>}
    </div>
  );
}

export function PanelTransmision({ robots, onBack }) {
  const { t } = useLanguage();

  // Solo los marcados como evento público: el resto no emite token de
  // espectador, así que ofrecer su enlace sería ofrecer un error.
  //
  // OJO con el nombre del campo: la API entrega `isPublicEvent` en camelCase
  // (services/robots/server.js lo mapea desde la columna `is_public_event`).
  // Filtrar por el nombre de la columna deja la lista siempre vacía y el panel
  // dice "no hay unidades públicas" con una unidad pública delante.
  const publicos = useMemo(
    () => (robots || []).filter((r) => r.isPublicEvent),
    [robots]
  );

  const [robotId, setRobotId] = useState('');

  // La lista llega por red, después del primer render: si la unidad elegida se
  // fijara solo en el estado inicial, se quedaría vacía para siempre y las
  // direcciones saldrían sin identificador. También cubre el caso de que la
  // unidad elegida deje de ser pública mientras el panel está abierto.
  useEffect(() => {
    if (publicos.length === 0) return;
    if (!publicos.some((r) => r.id === robotId)) {
      setRobotId(publicos[0].id);
    }
  }, [publicos, robotId]);
  const [layout, setLayout] = useState('franja');
  const [datos, setDatos] = useState(DATOS.map((d) => d.id));
  const [escala, setEscala] = useState(1);
  const [align, setAlign] = useState('abajo');

  const base = window.location.origin;
  const robot = publicos.find((r) => r.id === robotId);

  useEffect(() => {
    const forzarScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
      }
    };
    forzarScroll();
    const rafId = requestAnimationFrame(forzarScroll);
    const t1 = setTimeout(forzarScroll, 40);
    const t2 = setTimeout(forzarScroll, 120);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const urlEspectador = `${base}/espectador/${robotId}`;

  const urlOverlay = useMemo(() => {
    const p = new URLSearchParams();
    if (layout !== 'franja') p.set('layout', layout);
    // Solo se listan los datos si NO están todos: una URL con la lista
    // completa dice lo mismo que una sin el parámetro, y es más larga.
    if (datos.length !== DATOS.length) p.set('widgets', datos.join(','));
    if (escala !== 1) p.set('escala', String(escala));
    if (align !== 'abajo') p.set('align', align);
    const cadena = p.toString();
    return `${base}/overlay/${robotId}${cadena ? `?${cadena}` : ''}`;
  }, [base, robotId, layout, datos, escala, align]);

  const alternarDato = (id) => {
    setDatos((previos) =>
      previos.includes(id) ? previos.filter((x) => x !== id) : [...previos, id]
    );
  };

  if (publicos.length === 0) {
    return (
      <div className="tx">
        <header className="tx__cabecera" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <button className="back-link" onClick={onBack} style={{ margin: 0 }}>{t('transmision.volver')}</button>
          <h2 className="tx__titulo" style={{ margin: 0 }}><Radio size={20} /> {t('transmision.titulo')}</h2>
        </header>
        <p className="tx-nota tx-nota--vacio">{t('transmision.sinRobotsPublicos')}</p>
      </div>
    );
  }

  return (
    <div className="tx">
      <header className="tx__cabecera" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <button className="back-link" onClick={onBack} style={{ margin: 0 }}>{t('transmision.volver')}</button>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <h2 className="tx__titulo" style={{ margin: 0 }}><Radio size={20} /> {t('transmision.titulo')}</h2>
          <p className="tx-nota" style={{ margin: '4px 0 0 0' }}>{t('transmision.intro')}</p>
        </div>
      </header>

      <section className="tx__bloque">
        <h3 className="tx__subtitulo">{t('transmision.unidad')}</h3>
        <select className="tx__select" value={robotId} onChange={(e) => setRobotId(e.target.value)}>
          {publicos.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </section>

      <section className="tx__bloque">
        <h3 className="tx__subtitulo">{t('transmision.enlacePublico')}</h3>
        <p className="tx-nota">{t('transmision.enlacePublicoNota')}</p>
        <Direccion url={urlEspectador} />
      </section>

      <section className="tx__bloque">
        <h3 className="tx__subtitulo">{t('transmision.capaObs')}</h3>
        <p className="tx-nota">{t('transmision.capaObsNota')}</p>

        <div className="tx__controles">
          <label className="tx__campo">
            <span>{t('transmision.disposicion')}</span>
            <select className="tx__select" value={layout} onChange={(e) => setLayout(e.target.value)}>
              <option value="franja">{t('transmision.franja')}</option>
              <option value="suelto">{t('transmision.suelto')}</option>
            </select>
          </label>

          <label className="tx__campo">
            <span>{t('transmision.posicion')}</span>
            <select className="tx__select" value={align} onChange={(e) => setAlign(e.target.value)}>
              <option value="abajo">{t('transmision.abajo')}</option>
              <option value="arriba">{t('transmision.arriba')}</option>
              <option value="centro">{t('transmision.centro')}</option>
            </select>
          </label>

          <label className="tx__campo">
            <span>{t('transmision.escala')}</span>
            <select className="tx__select" value={escala} onChange={(e) => setEscala(Number(e.target.value))}>
              <option value={1}>1× (1080p)</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2× (4K)</option>
            </select>
          </label>
        </div>

        <div className="tx__datos">
          {DATOS.map(({ id, etiqueta }) => (
            <label key={id} className={`tx__dato${datos.includes(id) ? ' tx__dato--on' : ''}`}>
              <input type="checkbox" checked={datos.includes(id)} onChange={() => alternarDato(id)} />
              {etiqueta}
            </label>
          ))}
        </div>

        <Direccion
          url={urlOverlay}
          urlPrevia={`${urlOverlay}${urlOverlay.includes('?') ? '&' : '?'}fondo=oscuro`}
          nota={t('transmision.notaFondo')}
        />
      </section>

      <section className="tx__bloque">
        <h3 className="tx__subtitulo">{t('transmision.comoUsar')}</h3>
        <ol className="tx__pasos">
          <li>{t('transmision.paso1')}</li>
          <li>{t('transmision.paso2')}</li>
          <li>{t('transmision.paso3')}</li>
          <li>{t('transmision.paso4')}</li>
        </ol>
      </section>

      {robot && !robot.livekitUrl && (
        <p className="tx-nota tx-nota--aviso">{t('transmision.sinLivekit')}</p>
      )}
    </div>
  );
}
