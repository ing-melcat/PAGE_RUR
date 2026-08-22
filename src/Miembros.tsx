import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useLanguage } from './lib/i18n';
import { RedesMiembro } from './components/RedesMiembro';
import { Medallas } from './components/Medallas';
import { PortadaSeccion } from './components/PortadaSeccion';
import './Miembros.css';

/**
 * Quién forma el grupo, y qué ha construido cada uno.
 *
 * La diferencia con un "conócenos" al uso está en el orden de lectura: lo
 * primero que se ve de cada persona no es su cara ni su cargo, es la lista de
 * proyectos que firma. Un cargo lo escribe cualquiera; un rover documentado y
 * publicado, no.
 *
 * Por eso el historial no se escribe a mano en ningún sitio: sale de las
 * publicaciones que ya existen en la web. Cuando alguien firma un proyecto
 * nuevo desde el panel, aparece solo en su ficha, y no hay forma de que la
 * página diga que alguien hizo algo que el sitio no publica.
 *
 * Quién aparece aquí lo decide la coordinación desde el panel de personal; los
 * textos que se publican los escribe cada quien en su perfil.
 *
 * La lista es plana. Estuvo agrupada por área, con un título por bloque, y el
 * problema no era el criterio sino que era el único: quien buscaba por medalla
 * o por nombre tenía que recorrer todos los grupos igual, y las áreas de una
 * sola persona dejaban titulares sueltos por toda la página. Ahora el área es
 * un filtro más, que se aplica cuando hace falta y no estorba cuando no.
 */

type Proyecto = { id: string; titulo: string; papel: string | null };

type Miembro = {
  id: number;
  slug: string;
  nombre: string;
  rol: string;
  area: string;
  generacion: string;
  bio: string;
  foto: string;
  redes: Record<string, string>;
  medallas: any[];
  proyectos: Proyecto[];
};

function Iniciales({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return <span className="miembro__iniciales">{iniciales}</span>;
}

// Sin acentos y en minúsculas: quien escribe "electronica" busca lo mismo que
// quien escribe "Electrónica", y en un buscador de una sola caja no hay dónde
// explicarle que no.
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

type Grupo = { clave: 'area' | 'rol' | 'medalla'; titulo: string; opciones: string[] };

export function Miembros() {
  const { t } = useLanguage();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  // Un conjunto por grupo. Dentro de un grupo las opciones suman (área
  // Hardware O Software); entre grupos se cruzan (área Hardware Y con medalla
  // de Líder), que es lo que se espera de un panel de filtros.
  const [elegidos, setElegidos] = useState<Record<string, Set<string>>>({
    area: new Set(), rol: new Set(), medalla: new Set(),
  });
  const [abierto, setAbierto] = useState(false);
  const filtroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/miembros')
      .then((res) => res.json())
      .then((datos: Miembro[]) => {
        if (!cancelado) setMiembros(Array.isArray(datos) ? datos : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => { cancelado = true; };
  }, []);

  // Cerrar al pulsar fuera o con Escape. Un desplegable que solo se cierra con
  // su propio botón deja media pantalla tapada en cuanto alguien mira a otro
  // lado, y en móvil ocupa casi todo.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (filtroRef.current && !filtroRef.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  // Las opciones salen de la gente que hay, no de una lista escrita a mano: un
  // filtro que ofrece un área sin nadie dentro solo sirve para llevar a una
  // pantalla vacía.
  const grupos = useMemo<Grupo[]>(() => {
    const juntar = (valores: string[]) => [...new Set(valores.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const posibles: Grupo[] = [
      { clave: 'area', titulo: t('miembros.filtroArea'), opciones: juntar(miembros.map((m) => m.area)) },
      { clave: 'rol', titulo: t('miembros.filtroRol'), opciones: juntar(miembros.map((m) => m.rol)) },
      { clave: 'medalla', titulo: t('miembros.filtroMedallas'), opciones: juntar(miembros.flatMap((m) => (m.medallas ?? []).map((x: any) => x.nombre))) },
    ];
    // Con una sola opción no hay nada que elegir: filtrar por ella deja la
    // lista igual o casi, y ocupa sitio en el desplegable.
    return posibles.filter((g) => g.opciones.length > 1);
  }, [miembros, t]);

  const activos = Object.values(elegidos).reduce((n, s) => n + s.size, 0);

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return miembros.filter((m) => {
      if (elegidos.area.size && !elegidos.area.has(m.area)) return false;
      if (elegidos.rol.size && !elegidos.rol.has(m.rol)) return false;
      if (elegidos.medalla.size) {
        const suyas = (m.medallas ?? []).map((x: any) => x.nombre);
        if (!suyas.some((n: string) => elegidos.medalla.has(n))) return false;
      }
      if (!texto) return true;
      // Se busca también en los proyectos: es lo que distingue a la gente aquí,
      // y quien recuerda el rover pero no quién lo hizo llega igual.
      const heno = normalizar([
        m.nombre, m.rol, m.area, m.bio, m.generacion,
        ...m.proyectos.map((p) => p.titulo),
      ].filter(Boolean).join(' '));
      return heno.includes(texto);
    });
  }, [miembros, busqueda, elegidos]);

  const alternar = (clave: string, valor: string) => {
    setElegidos((previo) => {
      const copia = new Set(previo[clave]);
      if (copia.has(valor)) copia.delete(valor); else copia.add(valor);
      return { ...previo, [clave]: copia };
    });
  };

  const limpiar = () => {
    setElegidos({ area: new Set(), rol: new Set(), medalla: new Set() });
    setBusqueda('');
  };

  return (
    <div className="miembros-pagina">
      <PortadaSeccion claseFoto="miembros__fondo" titulo={t('miembros.titulo')} />

      <section className="responsive-section">
        {cargando ? (
          <p className="miembros__vacio">{t('miembros.cargando')}</p>
        ) : miembros.length === 0 ? (
          <p className="miembros__vacio">{t('miembros.vacio')}</p>
        ) : (
          <>
            <div className="miembros__barra-util">
              {/* La caja se abre al pasar el ratón y al recibir el foco, y se
                  queda abierta mientras tenga texto: si se cerrara con algo
                  escrito, se ocultaría el motivo por el que faltan personas en
                  la lista. El focus-within también resuelve el táctil, donde no
                  hay hover: al tocar, el input recibe el foco. */}
              <div className={`buscador${busqueda ? ' buscador--fija' : ''}`}>
                <Search size={16} className="buscador__icono" aria-hidden="true" />
                <input
                  type="search"
                  className="buscador__campo"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={t('miembros.buscarPista')}
                  aria-label={t('miembros.buscar')}
                />
              </div>

              {grupos.length > 0 && (
                <div className="filtros" ref={filtroRef}>
                  <button
                    type="button"
                    className={`filtros__boton${activos ? ' filtros__boton--activo' : ''}`}
                    onClick={() => setAbierto((v) => !v)}
                    aria-expanded={abierto}
                  >
                    <SlidersHorizontal size={15} aria-hidden="true" />
                    {t('miembros.filtrar')}
                    {activos > 0 && <span className="filtros__cuenta">{activos}</span>}
                  </button>

                  {abierto && (
                    <div className="filtros__panel">
                      {grupos.map((g) => (
                        <div key={g.clave} className="filtros__grupo">
                          <p className="filtros__titulo">{g.titulo}</p>
                          {g.opciones.map((o) => (
                            <label key={o} className="filtros__opcion">
                              <input
                                type="checkbox"
                                checked={elegidos[g.clave].has(o)}
                                onChange={() => alternar(g.clave, o)}
                              />
                              <span>{o}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                      <div className="filtros__pie">
                        <button type="button" className="filtros__limpiar" onClick={limpiar}>
                          {t('miembros.limpiar')}
                        </button>
                        <button
                          type="button"
                          className="filtros__cerrar"
                          onClick={() => setAbierto(false)}
                          aria-label={t('miembros.cerrarFiltros')}
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cuántas quedan. Con la lista filtrada, sin este número no se
                  distingue "hay tres personas de electrónica" de "el filtro se
                  ha comido a los demás". aria-live para quien no ve la rejilla
                  cambiar. */}
              <p className="miembros__cuenta" aria-live="polite">
                {t(visibles.length === 1 ? 'miembros.unaPersona' : 'miembros.nPersonas')
                  .replace('{n}', String(visibles.length))}
              </p>
            </div>

            {visibles.length === 0 ? (
              <p className="miembros__vacio">{t('miembros.sinResultados')}</p>
            ) : (
              <div className="miembros__rejilla">
                {visibles.map((m, i) => (
                  <motion.article
                    key={m.id}
                    className="miembro"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{
                      duration: 0.5,
                      ease: [0.25, 1, 0.5, 1],
                      // Escalonado corto: las tarjetas de una misma fila
                      // entran una detrás de otra, no todas a la vez. Se corta
                      // a la cuarta para que la última no espere medio segundo.
                      delay: Math.min(i, 3) * 0.06,
                    }}
                  >
                    <header className="miembro__cabecera">
                      <div className="miembro__retrato">
                        {m.foto
                          ? <img src={m.foto} alt="" loading="lazy" />
                          : <Iniciales nombre={m.nombre} />}
                      </div>

                      <div className="miembro__identidad">
                        <h3 className="miembro__nombre">
                          <Link to={`/${m.slug}`} className="miembro__enlace">
                            {m.nombre}
                          </Link>
                        </h3>
                        {m.rol && <p className="miembro__rol">{m.rol}</p>}
                        {m.generacion && (
                          <p className="miembro__generacion">
                            {t('miembros.desde').replace('{a}', m.generacion)}
                          </p>
                        )}
                      </div>
                    </header>

                    {m.bio && <p className="miembro__bio">{m.bio}</p>}

                    {/* Cuánto ha hecho, no qué. El detalle está en su
                        perfil; aquí solo el dato que invita a entrar. */}
                    {m.proyectos.length > 0 && (
                      <p className="miembro__cuenta">
                        {t(m.proyectos.length === 1 ? 'miembros.unProyecto' : 'miembros.nProyectos')
                          .replace('{n}', String(m.proyectos.length))}
                      </p>
                    )}

                    <div className="miembro__pie">
                      <RedesMiembro redes={m.redes} nombre={m.nombre} />
                      <Medallas medallas={m.medallas} compactas />
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
