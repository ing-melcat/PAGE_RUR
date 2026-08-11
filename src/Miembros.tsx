import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from './lib/i18n';
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
 * Aparecer aquí es voluntario y está apagado por defecto: la sección se llena
 * porque cada quien lo activa en su perfil, no porque exista una tabla de
 * usuarios que volcar.
 */

type Proyecto = { id: string; titulo: string; papel: string | null };

type Miembro = {
  id: number;
  nombre: string;
  rol: string;
  area: string;
  generacion: string;
  bio: string;
  foto: string;
  github: string;
  linkedin: string;
  instagram: string;
  proyectos: Proyecto[];
};

// github: 'Ing-melcat' y github: 'https://github.com/Ing-melcat' conviven en
// la base, porque el campo se rellenó a mano y en su día no pedía una URL.
// Aquí se acepta cualquiera de las dos formas en vez de mostrar un enlace
// roto a quien escribió solo su usuario.
function enlaceRed(base: string, valor: string) {
  const v = valor.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return base + v.replace(/^@/, '');
}

function Iniciales({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return <span className="miembro__iniciales">{iniciales}</span>;
}

export function Miembros() {
  const { t } = useLanguage();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);

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

  // Agrupado por área. Una lista plana de personas obliga a leerlas todas
  // para saber quién hace qué; por áreas, quien busca a alguien de electrónica
  // va directo a su bloque. Quien no ha puesto área cae en un grupo final sin
  // título, en vez de inventarle uno.
  const areas = new Map<string, Miembro[]>();
  for (const m of miembros) {
    const clave = m.area || '';
    if (!areas.has(clave)) areas.set(clave, []);
    areas.get(clave)!.push(m);
  }

  return (
    <div className="miembros-pagina">
      <section className="portada">
        <div className="portada__marco portada__marco--seccion">
          <div className="portada__foto miembros__fondo" />
          <div className="portada__velo" />

          <div className="portada__texto portada__texto--marcado">
            <h1>{t('miembros.titulo')}</h1>
          </div>
        </div>
      </section>

      <section className="responsive-section">
        {cargando ? (
          <p className="miembros__vacio">{t('miembros.cargando')}</p>
        ) : miembros.length === 0 ? (
          <p className="miembros__vacio">{t('miembros.vacio')}</p>
        ) : (
          [...areas.entries()].map(([area, gente]) => (
            <div key={area || 'sin-area'} className="miembros__area">
              {area && (
                <h2 className="miembros__area-titulo">
                  <span className="miembros__barra">/</span> {area}
                </h2>
              )}

              <div className="miembros__rejilla">
                {gente.map((m, i) => (
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
                        <h3 className="miembro__nombre">{m.nombre}</h3>
                        {m.rol && <p className="miembro__rol">{m.rol}</p>}
                        {m.generacion && (
                          <p className="miembro__generacion">
                            {t('miembros.desde').replace('{a}', m.generacion)}
                          </p>
                        )}
                      </div>
                    </header>

                    {m.bio && <p className="miembro__bio">{m.bio}</p>}

                    {/* El historial. Va después del nombre pero es lo que de
                        verdad sostiene la ficha, así que lleva su propia
                        etiqueta y sus enlaces son reales: llevan a la
                        publicación del proyecto. */}
                    {m.proyectos.length > 0 && (
                      <div className="miembro__proyectos">
                        <p className="miembro__etiqueta">{t('miembros.proyectos')}</p>
                        <ul>
                          {m.proyectos.map((p) => (
                            <li key={p.id}>
                              <Link to={`/publicacion/${p.id}`} className="miembro__proyecto">
                                <span className="miembro__proyecto-titulo">{p.titulo}</span>
                                {p.papel && <span className="miembro__papel">{p.papel}</span>}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(m.github || m.linkedin || m.instagram) && (
                      <footer className="miembro__redes">
                        {m.linkedin && (
                          <a href={enlaceRed('https://www.linkedin.com/in/', m.linkedin)}
                             target="_blank" rel="noopener noreferrer"
                             aria-label={`LinkedIn de ${m.nombre}`}>in</a>
                        )}
                        {m.github && (
                          <a href={enlaceRed('https://github.com/', m.github)}
                             target="_blank" rel="noopener noreferrer"
                             aria-label={`GitHub de ${m.nombre}`}>gh</a>
                        )}
                        {m.instagram && (
                          <a href={enlaceRed('https://instagram.com/', m.instagram)}
                             target="_blank" rel="noopener noreferrer"
                             aria-label={`Instagram de ${m.nombre}`}>ig</a>
                        )}
                      </footer>
                    )}
                  </motion.article>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
