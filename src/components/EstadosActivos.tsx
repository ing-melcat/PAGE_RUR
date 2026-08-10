import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';
import { useEnVivo } from '../lib/useEnVivo';
import './EstadosActivos.css';

type Publicacion = { id: string; title: string; type: string; date?: string };

/**
 * Lo que está pasando ahora mismo, en la barra de navegación.
 *
 * Reúne dos cosas que antes vivían por separado y se estorbaban: el aviso de
 * transmisión en vivo y el indicador de aviso/evento que sale de las
 * publicaciones. Cada uno tenía su propia forma —uno era un chip con borde,
 * el otro texto suelto—, su propio sitio en la barra y su propio punto
 * parpadeante. Dos puntos latiendo a la vez, con dos estilos distintos, se
 * leen como un error de maquetación, no como dos noticias.
 *
 * Ahora comparten forma y solo cambian de color y de destino. Las reglas:
 *
 * - **Orden por urgencia**, no por tipo: primero lo que está ocurriendo en
 *   directo, luego lo que va a ocurrir. Si aparece una transmisión mientras
 *   hay un evento anunciado, la transmisión pasa delante.
 * - **Todos llevan a alguna parte.** El indicador de evento antes no era
 *   pulsable: decía "hay un evento" y dejaba al visitante buscándolo por el
 *   sitio. Ahora abre la publicación.
 * - **Máximo dos.** Con tres la barra se convierte en un tablón de anuncios y
 *   deja de leerse ninguno.
 */

type Estado = {
  clave: string;
  etiqueta: string;
  detalle?: string;
  destino: string;
  tono: 'directo' | 'aviso' | 'evento';
};

export function EstadosActivos({ alCerrarMenu }: { alCerrarMenu?: () => void }) {
  const { t } = useLanguage();
  // La transmisión la resuelve el hook común: si cada anuncio hiciera su
  // propia consulta, uno podría estar mostrando el aviso mientras el otro ya
  // lo ha retirado.
  const enVivo = useEnVivo();
  const [especiales, setEspeciales] = useState<Publicacion[]>([]);

  // Publicaciones: una sola vez. Un aviso o un evento no aparecen de repente
  // mientras alguien mira la página, así que sondearlos sería gasto sin uso.
  useEffect(() => {
    let cancelado = false;
    fetch('/api/posts')
      .then((res) => res.json())
      .then((datos: Publicacion[]) => {
        if (cancelado) return;
        // Orden por urgencia y luego por fecha: un aviso pesa más que un
        // evento (uno advierte, el otro invita), y entre dos del mismo tipo
        // manda el más reciente.
        const orden = { aviso: 0, evento: 1 } as Record<string, number>;
        setEspeciales(
          datos
            .filter((p) => p.type === 'aviso' || p.type === 'evento')
            .sort((a, b) =>
              (orden[a.type] - orden[b.type]) ||
              String(b.date ?? '').localeCompare(String(a.date ?? ''))
            )
        );
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, []);

  const estados: Estado[] = [];

  if (enVivo) {
    estados.push({
      clave: 'vivo',
      etiqueta: t('envivo.etiqueta'),
      detalle: enVivo.name,
      destino: `/espectador/${enVivo.id}`,
      tono: 'directo',
    });
  }

  if (especiales.length === 1) {
    const p = especiales[0];
    estados.push({
      clave: p.type,
      etiqueta: p.type === 'aviso' ? t('nav.avisoActivo') : t('nav.eventoActivo'),
      detalle: p.title,
      destino: `/publicacion/${p.id}`,
      tono: p.type === 'aviso' ? 'aviso' : 'evento',
    });
  } else if (especiales.length > 1) {
    // Con más de uno NO se listan: la barra no es un tablón de anuncios, y
    // tres o cuatro chips seguidos hacen que no se lea ninguno. Se anuncia
    // cuántos hay y se manda al archivo, que es la pantalla hecha para
    // recorrerlos. El tono lo marca el más urgente de todos.
    estados.push({
      clave: 'varios',
      etiqueta: t('nav.variosActivos').replace('{n}', String(especiales.length)),
      detalle: especiales[0].title,
      destino: '/archivo',
      tono: especiales[0].type === 'aviso' ? 'aviso' : 'evento',
    });
  }

  if (estados.length === 0) return null;

  return (
    <div className="estados">
      {estados.slice(0, 2).map((e) => (
        <Link
          key={e.clave}
          to={e.destino}
          className={`estado estado--${e.tono}`}
          title={e.detalle}
          aria-label={e.detalle ? `${e.etiqueta}: ${e.detalle}` : e.etiqueta}
          onClick={alCerrarMenu}
        >
          <span className="estado__punto" />
          <span className="estado__etiqueta">{e.etiqueta}</span>
        </Link>
      ))}
    </div>
  );
}
