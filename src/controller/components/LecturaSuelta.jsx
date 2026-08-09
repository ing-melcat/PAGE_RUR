import { ACTUADORES, NIVEL_MAX } from '../telemetria';
import { useTelemetria } from '../useTelemetria';
import { useEstadisticasEnlace } from '../useEstadisticasEnlace';
import { useLanguage } from '../../lib/i18n';
import '../Overlay.css';

/**
 * Uno o varios datos sueltos, sin marco ni fondo, para colocarlos por separado
 * en una escena de OBS (`/overlay/:robotId?layout=suelto&widgets=avance`).
 *
 * Es el mismo dato que muestra la franja, pero desnudo: quien compone la
 * escena decide dónde va y a qué tamaño. Por eso aquí no hay degradado ni
 * caja — cualquier fondo propio se vería como un recuadro pegado encima del
 * vídeo, que es justo lo que un overlay bien hecho no tiene.
 *
 * La sombra de texto no es decoración: sobre un vídeo claro (cielo, arena,
 * un foco) el hueso sobre transparente desaparece. Es la única forma de
 * garantizar legibilidad sin saber qué habrá detrás.
 */
export function LecturaSuelta({ room, widgets }) {
  const { t } = useLanguage();
  const { telemetria, enVivo } = useTelemetria(room);
  const enlace = useEstadisticasEnlace(room, true);

  const ids = widgets?.length ? widgets : ['avance'];

  const aPorcentaje = (bloque) =>
    bloque?.nivel != null ? Math.round((bloque.nivel * 100) / NIVEL_MAX) : null;

  const lectura = (id) => {
    switch (id) {
      case 'avance': {
        const v = aPorcentaje(telemetria.avance);
        const atras = telemetria.avance?.dir === 'atras';
        return { etiqueta: t('telemetria.avance'), valor: v == null ? '—' : `${atras ? '▼' : '▲'} ${v}%` };
      }
      case 'giro': {
        const v = aPorcentaje(telemetria.giro);
        const izq = telemetria.giro?.dir === 'izquierda';
        return { etiqueta: t('telemetria.giro'), valor: v == null ? '—' : `${izq ? '◀' : '▶'} ${v}%` };
      }
      case 'actuadores': {
        const on = ACTUADORES.filter(({ clave }) => telemetria.actuadores?.[clave]);
        return {
          etiqueta: t('telemetria.actuadores'),
          valor: on.length ? on.map(({ abrev }) => abrev).join(' · ') : '——',
        };
      }
      case 'audiencia':
        return { etiqueta: t('telemetria.espectadores'), valor: enlace?.espectadores ?? '—' };
      case 'calidad':
        return { etiqueta: t('telemetria.enlace'), valor: enlace?.calidad ?? '—' };
      case 'bitrate':
        return { etiqueta: t('telemetria.bitrate'), valor: enlace?.bitrateKbps ?? '—', unidad: t('telemetria.kbps') };
      case 'estado':
        return { etiqueta: t('telemetria.enlace'), valor: enVivo ? t('telemetria.enVivo') : t('telemetria.sinSenal') };
      default:
        return null;
    }
  };

  return (
    <div className="suelto">
      {ids.map((id) => {
        const dato = lectura(id);
        if (!dato) return null;
        return (
          <div key={id} className="suelto__item">
            <span className="suelto__etiqueta">{dato.etiqueta}</span>
            <span className="suelto__valor">
              {dato.valor}
              {dato.unidad && <span className="suelto__unidad"> {dato.unidad}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
