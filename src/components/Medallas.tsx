import { useLanguage } from '../lib/i18n';
import './Medallas.css';

/**
 * Las medallas de una persona.
 *
 * Dos tamaños porque son dos lecturas distintas: en la tarjeta de la rejilla
 * solo el icono —la tarjeta se recortó a propósito y no puede volver a
 * llenarse—, y en el perfil el nombre y por qué se tiene.
 *
 * Las tres calculadas se explican solas con su regla. La de Excelencia lleva
 * además quién la dio y cuándo: es la única que no se puede comprobar en los
 * datos, así que lo que la sostiene es que alguien puso su nombre detrás.
 */

type Medalla = {
  clave: string;
  nombre: string;
  descripcion: string;
  motivo?: string;
  otorgada_por?: string;
  fecha?: string;
};

// Formas, no solo colores: una medalla que solo se distingue por su tono deja
// fuera a quien no separa el ámbar del verde, y aquí hay cuatro a la vez.
const ICONOS: Record<string, string> = {
  proyecto: '▲',
  aportes: '◆',
  lider: '★',
  excelencia: '✦',
};

export function Medallas({ medallas, compactas = false }: { medallas: Medalla[]; compactas?: boolean }) {
  const { t } = useLanguage();
  if (!medallas?.length) return null;

  if (compactas) {
    return (
      <span className="medallas medallas--compactas">
        {medallas.map((m) => (
          <span
            key={m.clave}
            className={`medalla medalla--${m.clave}`}
            title={`${m.nombre}: ${m.descripcion}`}
            aria-label={m.nombre}
          >
            {ICONOS[m.clave] ?? '●'}
          </span>
        ))}
      </span>
    );
  }

  return (
    <ul className="medallas">
      {medallas.map((m) => (
        <li key={m.clave} className={`medalla-detalle medalla--${m.clave}`}>
          <span className="medalla-detalle__icono" aria-hidden="true">{ICONOS[m.clave] ?? '●'}</span>
          <span>
            <span className="medalla-detalle__nombre">{m.nombre}</span>
            <span className="medalla-detalle__nota">
              {m.motivo || m.descripcion}
              {m.otorgada_por && (
                <span className="medalla-detalle__firma">
                  {' — '}
                  {t('miembros.otorgadaPor').replace('{quien}', m.otorgada_por)}
                  {m.fecha && `, ${new Date(m.fecha).toLocaleDateString()}`}
                </span>
              )}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
