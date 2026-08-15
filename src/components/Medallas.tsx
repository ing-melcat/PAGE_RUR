import { useLanguage } from '../lib/i18n';
import './Medallas.css';

/**
 * Las medallas de una persona.
 *
 * Dos tamaños porque son dos lecturas distintas: en la tarjeta de la rejilla
 * solo el icono —la tarjeta se recortó a propósito y no puede volver a
 * llenarse—, y en el perfil el nombre y por qué se tiene.
 *
 * Las automáticas se explican solas con su regla. Las especiales llevan además
 * quién las dio y cuándo: son las que no se pueden comprobar en los datos, así
 * que lo que las sostiene es que alguien puso su nombre detrás.
 */

type Medalla = {
  clave: string;
  nombre: string;
  descripcion: string;
  // Forma y color vienen de la tabla: las medallas se crean desde el panel, así
  // que no puede haber un mapa de iconos escrito aquí — una recién creada no
  // aparecería en él y saldría con el símbolo de relleno para siempre.
  icono?: string;
  color?: string;
  motivo?: string;
  otorgada_por?: string;
  fecha?: string;
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
            className="medalla"
            style={{ color: m.color }}
            title={`${m.nombre}: ${m.descripcion}`}
            aria-label={m.nombre}
          >
            {m.icono ?? '●'}
          </span>
        ))}
      </span>
    );
  }

  return (
    <ul className="medallas">
      {medallas.map((m) => (
        <li key={m.clave} className="medalla-detalle" style={{ color: m.color }}>
          <span className="medalla-detalle__icono" aria-hidden="true">{m.icono ?? '●'}</span>
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
