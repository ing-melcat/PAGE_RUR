import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';
import { useEnVivo } from '../lib/useEnVivo';
import './EstadosActivos.css';

type Publicacion = { id: string; title: string; type: string; date?: string; isHidden?: boolean };

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
            // `!p.isHidden` no sobra aunque /api/posts ya esconda lo oculto:
            // solo lo esconde a quien NO tiene sesión. Con la sesión abierta
            // devuelve todas las publicaciones, ocultas incluidas, así que
            // quien administra veía anunciado en la barra un evento que había
            // retirado y que ningún visitante podía abrir.
            .filter((p) => (p.type === 'aviso' || p.type === 'evento') && !p.isHidden)
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
    // Con más de uno NO se listan EN LA BARRA: no es un tablón de anuncios, y
    // tres o cuatro chips seguidos hacen que no se lea ninguno. Se anuncia
    // cuántos hay; el detalle de cada uno está en la tarjeta que despliega el
    // chip al pulsarlo. El tono lo marca el más urgente de todos.
    estados.push({
      clave: 'varios',
      etiqueta: t('nav.variosActivos').replace('{n}', String(especiales.length)),
      detalle: especiales[0].title,
      destino: '/archivo',
      tono: especiales[0].type === 'aviso' ? 'aviso' : 'evento',
    });
  }

  if (estados.length === 0) return null;

  // Lo que se despliega al pulsar: uno por cada cosa que está pasando, sin
  // colapsar. Es distinto de `estados`, que es lo que cabe en la barra. El
  // chip resume; la tarjeta enumera, que es lo que hace que "3 activos" deje
  // de ser una cifra sin nombres.
  const listado: Estado[] = [];
  if (enVivo) {
    listado.push({
      clave: 'vivo',
      etiqueta: t('envivo.etiqueta'),
      detalle: enVivo.name,
      destino: `/espectador/${enVivo.id}`,
      tono: 'directo',
    });
  }
  for (const p of especiales) {
    listado.push({
      clave: `pub-${p.id}`,
      etiqueta: p.type === 'aviso' ? t('nav.avisoActivo') : t('nav.eventoActivo'),
      detalle: p.title,
      destino: `/publicacion/${p.id}`,
      tono: p.type === 'aviso' ? 'aviso' : 'evento',
    });
  }

  return <Rotador estados={estados.slice(0, 2)} listado={listado} alCerrarMenu={alCerrarMenu} />;
}

/** Cada cuánto pasa el turno al siguiente estado. */
const TURNO_MS = 5000;

/**
 * Los puntos siempre; la etiqueta, por turnos.
 *
 * Dos chips completos ocupando la barra a la vez son dos anuncios pidiendo
 * atención de forma permanente, y lo permanente se vuelve invisible en dos
 * días. Aquí lo que se queda es lo mínimo que informa —un punto por cada cosa
 * que está pasando— y el texto se turna: siempre hay uno desplegado, nunca
 * dos, y el turno rota cada cinco segundos.
 *
 * El detalle que hace que esto no rompa la barra: **el ancho no cambia
 * nunca**. Todas las etiquetas se apilan en la misma celda de un grid, así
 * que la caja mide siempre lo que mide la más larga, esté visible la que
 * esté. Sin eso, cada relevo empujaría los botones de al lado y tendríamos
 * otra vez la barra bailando, que es justo lo que acabamos de arreglar.
 *
 * La rotación se detiene cuando alguien pasa el ratón o llega con el
 * teclado: si la estás leyendo, no se te escapa a mitad de frase.
 */
function Rotador({ estados, listado, alCerrarMenu }: { estados: Estado[]; listado: Estado[]; alCerrarMenu?: () => void }) {
  // Su propio `t`: los textos de la tarjeta se escriben aquí, y este
  // componente no recibe nada del de arriba salvo los datos.
  const { t } = useLanguage();
  const [activo, setActivo] = useState(0);
  const [detenido, setDetenido] = useState(false);
  const [abierta, setAbierta] = useState(false);
  const cajaRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  // Mientras la tarjeta está abierta la etiqueta no rota: el relevo movería
  // el texto del chip justo cuando se está leyendo lo que desplegó.
  const rotacionParada = detenido || abierta;

  // Cerrar es tan importante como abrir. Un panel que solo se quita pulsando
  // otra vez el mismo botón se queda por delante de la página en cuanto
  // alguien mira a otro lado.
  useEffect(() => {
    if (!abierta) return;

    const alPulsarFuera = (e: MouseEvent) => {
      if (!cajaRef.current?.contains(e.target as Node)) setAbierta(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAbierta(false);
      // El foco vuelve al chip: quien cerró con el teclado no puede quedarse
      // sin sitio en la página.
      botonRef.current?.focus();
    };

    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierta]);

  useEffect(() => {
    // Con un solo estado no hay turnos que repartir: se queda desplegado.
    if (estados.length < 2 || rotacionParada) return;

    // Quien tiene la pestaña en segundo plano no está viendo los relevos;
    // seguir rotando solo gasta batería.
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducido) return;

    const id = setInterval(() => {
      setActivo((i) => (i + 1) % estados.length);
    }, TURNO_MS);
    return () => clearInterval(id);
  }, [estados.length, rotacionParada]);

  // Si desaparece un estado (termina la transmisión), el índice puede quedar
  // apuntando fuera de la lista.
  const indice = activo % estados.length;

  return (
    <div className="estados-caja" ref={cajaRef}>
      {/* El chip es UN botón, no varios enlaces.
          Antes cada punto llevaba directamente a su publicación, que con un
          solo activo estaba bien y con tres obligaba a adivinar cuál era
          cuál por el color. Ahora pulsar abre la tarjeta y allí cada cosa
          aparece con su nombre. El destino sigue a un clic, solo que con el
          rótulo delante. */}
      <button
        type="button"
        ref={botonRef}
        className="estados"
        aria-expanded={abierta}
        aria-haspopup="true"
        aria-label={t('nav.verActivos').replace('{n}', String(listado.length))}
        onClick={() => setAbierta((v) => !v)}
        onMouseEnter={() => setDetenido(true)}
        onMouseLeave={() => setDetenido(false)}
        onFocus={() => setDetenido(true)}
        onBlur={() => setDetenido(false)}
      >
        {/* Los puntos: uno por cada cosa que está pasando. Ya no son enlaces
            —el botón que los contiene es el que actúa—, así que van marcados
            como decoración: su información la da el aria-label de arriba. */}
        {estados.map((e, i) => (
          <span
            key={e.clave}
            className={`estado estado--${e.tono}${i === indice ? ' estado--en-turno' : ''}`}
            aria-hidden="true"
          >
            <span className="estado__punto" />
          </span>
        ))}

        {/* La zona de texto es ÚNICA y de ancho fijo: todas las etiquetas se
            apilan en la misma celda del grid, así que mide siempre lo que la
            más larga, esté visible la que esté. Es lo que permite que el
            relevo no empuje nada a su alrededor. */}
        <span className="estados__texto" aria-hidden="true">
          {estados.map((e, i) => (
            <span
              key={e.clave}
              className={`estados__etiqueta${i === indice ? ' estados__etiqueta--visible' : ''}`}
            >
              {e.etiqueta}
            </span>
          ))}
        </span>
      </button>

      <AnimatePresence>
        {abierta && (
          <motion.div
            className="estados-tarjeta"
            role="group"
            aria-label={t('nav.activosTitulo')}
            initial={{ opacity: 0, scale: .94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .96, y: -4 }}
            // Muelle, no curva fija: la tarjeta se asienta en vez de
            // frenar en seco, que es lo que la hace parecer que crece del
            // chip y no que aparece encima de la página.
            transition={{ type: 'spring', stiffness: 460, damping: 34, mass: .7 }}
          >
            <p className="estados-tarjeta__titulo">{t('nav.activosTitulo')}</p>

            <ul className="estados-tarjeta__lista">
              {listado.map((e) => (
                <li key={e.clave}>
                  <Link
                    to={e.destino}
                    className={`estados-tarjeta__fila estados-tarjeta__fila--${e.tono}`}
                    onClick={() => { setAbierta(false); alCerrarMenu?.(); }}
                  >
                    <span className="estado__punto" aria-hidden="true" />
                    <span className="estados-tarjeta__texto">
                      <span className="estados-tarjeta__que">{e.etiqueta}</span>
                      {/* El título es lo que de verdad distingue una fila de
                          otra: sin él, tres eventos se leen igual. */}
                      {e.detalle && <span className="estados-tarjeta__cual">{e.detalle}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
