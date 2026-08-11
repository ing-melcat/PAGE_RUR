import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from './lib/i18n';
import { RedesMiembro } from './components/RedesMiembro';
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
  redes: Record<string, string>;
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
      <PortadaSeccion claseFoto="miembros__fondo" titulo={t('miembros.titulo')} />

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
                        <h3 className="miembro__nombre">
                          <Link to={`/miembros/${m.id}`} className="miembro__enlace">
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
                    </div>
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
