import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from './lib/i18n';
import { RedesMiembro } from './components/RedesMiembro';
import { Medallas } from './components/Medallas';
import './Miembros.css';

/**
 * El perfil de una persona, con su historial completo.
 *
 * La tarjeta de la rejilla es una presentación; esto es el desarrollo. Va en
 * su propia URL y no en una ventana emergente porque un perfil es algo que se
 * enseña: se pega en un correo, se manda por chat, se abre desde el móvil de
 * otro. Un modal no se puede enlazar.
 */

type Proyecto = { id: string; titulo: string; papel: string | null; imagen: string | null };

type Miembro = {
  id: number;
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

export function PerfilMiembro() {
  const { t } = useLanguage();
  const { slug } = useParams();
  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'no-existe'>('cargando');

  useEffect(() => {
    let cancelado = false;
    setEstado('cargando');
    fetch(`/api/miembros/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((datos: Miembro) => {
        if (cancelado) return;
        setMiembro(datos);
        setEstado('listo');
      })
      .catch(() => {
        // Un perfil apagado y uno que nunca existió se tratan igual: la
        // página no dice "esta persona existe pero no quiere aparecer".
        if (!cancelado) setEstado('no-existe');
      });
    return () => { cancelado = true; };
  }, [slug]);

  if (estado === 'cargando') {
    return <p className="miembros__vacio">{t('miembros.cargando')}</p>;
  }

  if (estado === 'no-existe' || !miembro) {
    return (
      <div className="perfil-vacio">
        <p className="miembros__vacio">{t('miembros.noExiste')}</p>
        <Link to="/miembros" className="perfil__volver">{t('miembros.volver')}</Link>
      </div>
    );
  }

  const iniciales = miembro.nombre
    .split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <motion.div
      className="perfil"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
    >
      <Link to="/miembros" className="perfil__volver">{t('miembros.volver')}</Link>

      <div className="perfil__columnas">
        {/* Quién es: se queda a la vista mientras se recorre lo que ha hecho.
            Con un historial largo, tener que subir para recordar de quién es
            la lista es lo que rompe la lectura. */}
        <aside className="perfil__ficha">
          <div className="perfil__retrato-wrap">
            <div className="perfil__retrato-halo" aria-hidden="true" />
            <div className="perfil__retrato">
              {miembro.foto
                ? <img src={miembro.foto} alt="" />
                : <span className="miembro__iniciales">{iniciales}</span>}
            </div>
          </div>

          <h1 className="perfil__nombre">{miembro.nombre}</h1>
          {miembro.rol && <p className="perfil__rol">{miembro.rol}</p>}

          {(miembro.area || miembro.generacion) && (
            <p className="perfil__meta">
              <span className="perfil__meta-punto" aria-hidden="true" />
              {miembro.area}
              {miembro.area && miembro.generacion && <span className="perfil__sep">·</span>}
              {miembro.generacion && t('miembros.desde').replace('{a}', miembro.generacion)}
            </p>
          )}

          <RedesMiembro redes={miembro.redes} nombre={miembro.nombre} />

          {miembro.medallas?.length > 0 && (
            <div className="perfil__medallas">
              <p className="miembro__etiqueta">{t('miembros.medallas')}</p>
              <Medallas medallas={miembro.medallas} />
            </div>
          )}
        </aside>

        <div className="perfil__cuerpo">
          {miembro.bio && <p className="perfil__bio">{miembro.bio}</p>}

          <section className="perfil__seccion">
            <h2 className="miembros__area-titulo">
              <span className="miembros__barra">/</span> {t('miembros.proyectos')}
            </h2>

            {miembro.proyectos.length === 0 ? (
              <p className="miembros__vacio">{t('miembros.sinProyectos')}</p>
            ) : (
              <ul className="perfil__proyectos">
                {miembro.proyectos.map((p) => (
                  <li key={p.id}>
                    <Link to={`/publicacion/${p.id}`} className="perfil__proyecto">
                      <span className="perfil__proyecto-miniatura">
                        {p.imagen && <img src={p.imagen} alt="" loading="lazy" />}
                      </span>
                      <span className="perfil__proyecto-texto">
                        <span className="perfil__proyecto-titulo">{p.titulo}</span>
                        {p.papel && <span className="perfil__papel">{p.papel}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </motion.div>
  );
}
