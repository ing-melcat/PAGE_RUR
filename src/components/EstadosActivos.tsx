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

  return <Rotador estados={estados.slice(0, 2)} alCerrarMenu={alCerrarMenu} />;
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
function Rotador({ estados, alCerrarMenu }: { estados: Estado[]; alCerrarMenu?: () => void }) {
  const [activo, setActivo] = useState(0);
  const [detenido, setDetenido] = useState(false);

  useEffect(() => {
    // Con un solo estado no hay turnos que repartir: se queda desplegado.
    if (estados.length < 2 || detenido) return;

    // Quien tiene la pestaña en segundo plano no está viendo los relevos;
    // seguir rotando solo gasta batería.
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducido) return;

    const id = setInterval(() => {
      setActivo((i) => (i + 1) % estados.length);
    }, TURNO_MS);
    return () => clearInterval(id);
  }, [estados.length, detenido]);

  // Si desaparece un estado (termina la transmisión), el índice puede quedar
  // apuntando fuera de la lista.
  const indice = activo % estados.length;

  const enTurno = estados[indice];

  return (
    <div
      className="estados"
      onMouseEnter={() => setDetenido(true)}
      onMouseLeave={() => setDetenido(false)}
      onFocus={() => setDetenido(true)}
      onBlur={() => setDetenido(false)}
    >
      {/* Los puntos: uno por cada cosa que está pasando, siempre visibles.
          Cada uno es su propio enlace y lleva el texto completo en
          aria-label, así que el conjunto funciona igual con teclado y con
          lector de pantalla aunque la etiqueta de al lado esté rotando. */}
      {estados.map((e, i) => (
        <Link
          key={e.clave}
          to={e.destino}
          className={`estado estado--${e.tono}${i === indice ? ' estado--en-turno' : ''}`}
          title={e.detalle ? `${e.etiqueta}: ${e.detalle}` : e.etiqueta}
          aria-label={e.detalle ? `${e.etiqueta}: ${e.detalle}` : e.etiqueta}
          onClick={alCerrarMenu}
          // Apuntar a un punto concreto lo despliega sin esperar su turno.
          // Un punto de color no dice de qué es, y obligar a aguardar cinco
          // segundos para averiguarlo sería una adivinanza, no una interfaz.
          onMouseEnter={() => setActivo(i)}
          onFocus={() => setActivo(i)}
        >
          <span className="estado__punto" />
        </Link>
      ))}

      {/* La zona de texto es ÚNICA y de ancho fijo: todas las etiquetas se
          apilan en la misma celda del grid, así que mide siempre lo que la
          más larga, esté visible la que esté. Es lo que permite que el
          relevo no empuje nada a su alrededor.

          Va oculta al lector de pantalla y fuera del tabulador porque no
          añade nada: los puntos de arriba ya son los enlaces, con su texto
          completo. */}
      <Link
        to={enTurno.destino}
        className="estados__texto"
        tabIndex={-1}
        aria-hidden="true"
        onClick={alCerrarMenu}
      >
        {estados.map((e, i) => (
          <span
            key={e.clave}
            className={`estados__etiqueta${i === indice ? ' estados__etiqueta--visible' : ''}`}
          >
            {e.etiqueta}
          </span>
        ))}
      </Link>
    </div>
  );
}
