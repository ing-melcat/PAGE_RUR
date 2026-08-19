import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TriangleAlert, Star, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

import { useNavigate, useParams, Link } from 'react-router-dom';
import logoUrl from './assets/isotipo.png';
import logoBlancoUrl from './assets/real_images/isotipo_blanco.png';
import { markdownSanitizeSchema } from './lib/markdownSanitizeSchema';
import { useLanguage } from './lib/i18n';

// Carga diferida: three.js y @react-three pesan cerca de un megabyte y solo
// hacen falta si la publicación trae modelo 3D. Antes viajaban en el paquete
// de entrada de toda la web pública.
const VisorModelo3D = React.lazy(() => import('./VisorModelo3D'));

export const Countdown = ({ targetDate }: { targetDate?: string }) => {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(t('countdown.agotado'));
        clearInterval(interval);
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) return null;

  return (
    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '20px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }}></div>
      <div style={{ fontSize: '0.9rem', color: 'white', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', letterSpacing: '1px' }}>
        {timeLeft || t('countdown.calculando')}
      </div>
    </div>
  );
};

export const Landing = ({ category = 'landing', limit }: { category?: string, limit?: number }) => {
  const { t, lang } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/posts?lang=${lang}`)
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter((p: any) => (category === 'all' || (p.category || 'landing') === category) && !p.isHidden);
        const sorted = filtered.sort((a: any, b: any) => {
          const aIsSpecial = a.type === 'aviso' || a.type === 'evento';
          const bIsSpecial = b.type === 'aviso' || b.type === 'evento';
          if (aIsSpecial && !bIsSpecial) return -1;
          if (!aIsSpecial && bIsSpecial) return 1;
          return 0;
        });
        setPosts(limit ? sorted.slice(0, limit) : sorted);
      })
      .catch(console.error);
  }, [category, lang]);

  const handlePostClick = (post: any) => {
    navigate(`/publicacion/${post.id}`);
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 500px), 1fr))', gap: '40px' }}>
        {posts.map(post => {
          const previewText = (post.type === 'simple' || post.type === 'aviso' || post.type === 'evento' || post.type === '3d_model')
            ? post.previewText || ''
            : t('landing.previewMagazine');
          const isAviso = post.type === 'aviso';
          const isEvento = post.type === 'evento';
          const isSpecial = isAviso || isEvento;
          const specialColor = isAviso ? 'var(--error)' : 'var(--accent)';
          const isMagazine = post.type === 'magazine';
          const is3D = post.type === '3d_model';
          const badgeText = isAviso ? t('landing.avisoImportante') : isEvento ? t('landing.eventoEspecial') : isMagazine ? t('archivo.revista') : is3D ? '3D MODEL' : t('archivo.articulo');

          return (
            <motion.article 
              key={post.id}
              className="dashboard-card" 
              initial={{ opacity: 0, y: 40 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, amount: 0.1 }} 
              /* Muelle en vez de duración fija: la tarjeta llega y se asienta
                 con algo de peso, que es lo que la hacía sentirse "seca". */
              transition={{ type: 'spring', stiffness: 90, damping: 18, mass: 0.9 }} 
              whileHover={{ y: -6, boxShadow: '0 24px 48px rgba(0,0,0,0.55)' }}
              /* En táctil no hay "pasar por encima": sin esto, tocar una
                 tarjeta no produce ninguna reacción y parece que el toque se
                 ha perdido. Hundirla es la respuesta que todo el mundo
                 reconoce de una pulsación. */
              whileTap={{ scale: 0.98 }} 
              style={{ 
                padding: 0, overflow: 'hidden', display: 'flex', flexDirection: isSpecial ? 'row' : 'column', flexWrap: 'wrap', cursor: 'pointer',
                gridColumn: isSpecial ? '1 / -1' : 'auto',
                border: isSpecial ? '1px solid var(--border)' : 'none',
                /* La raya superior ya no es un `border`: la pinta .linea-viva
                   con la luz recorriéndola. Dejar los dos daría dos rayas,
                   una encima de la otra. */
                borderTop: 'none',
                ...(isSpecial ? { '--linea-color': specialColor, '--linea-alto': '2px' } as React.CSSProperties : {}),
                position: 'relative'
              }}
              onClick={() => handlePostClick(post)}
            >
              {/* La raya superior de color, con la luz recorriéndola. Va como
                  elemento y no como borde para poder animarla. */}
              {isSpecial && <span className="linea-viva" aria-hidden="true" />}

              <div style={{
                /* Proporción fija, no alto fijo.
                   Antes esto era `height: 300px` con el ancho a merced del
                   texto de al lado (flex: 1 1 300px), así que el hueco iba de
                   358 a 904 px de ancho manteniendo 300 de alto: la misma foto
                   se recortaba distinto en cada pantalla y era imposible
                   encuadrarla. Con 16:9 el hueco cambia de TAMAÑO pero nunca
                   de FORMA, así que una foto 16:9 encaja siempre igual. */
                flex: isSpecial ? '1 1 340px' : 'none',
                width: '100%',
                aspectRatio: '16 / 9',
                backgroundColor: 'var(--surface-strong)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {post.type === '3d_model' && post.modelUrl ? (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#101525', cursor: 'grab' }} onClick={(e) => e.stopPropagation()}>
                    <Suspense fallback={null}>
                      <VisorModelo3D url={post.modelUrl} variante="tarjeta" />
                    </Suspense>
                  </div>
                ) : (
                  /* <img> y no un background-image: solo un <img> admite
                     `loading="lazy"`, y con publicaciones que pesan más de un
                     mega, un fondo CSS obliga al navegador a descargarlas
                     TODAS al pintar la portada, se vean o no.
                     
                     Y solo si HAY imagen: un <img src=""> dibuja el icono de
                     archivo roto y el texto alternativo encima de la tarjeta,
                     mientras que el fondo CSS anterior simplemente no pintaba
                     nada. */
                  post.image ? (
                  <motion.img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                    /* A plena luz. El 0.7 venía de cuando el título iba ENCIMA de la
                        imagen y había que apagarla para leerlo; ahora el texto vive
                        en su propia mitad de la tarjeta, así que velar la foto no
                        protege nada — solo la deslustra. */
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                  />
                  ) : null
                )}
                {isSpecial ? (
                  <div style={{ position: 'absolute', top: 14, left: 14, background: specialColor, padding: '5px 11px', borderRadius: '2px', color: isAviso ? 'white' : 'black', fontSize: '0.68rem', letterSpacing: '0.1em', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10 }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isAviso ? 'white' : 'black', animation: 'pulse 1.5s infinite' }}></div>
                    {badgeText}
                  </div>
                ) : (
                  <div style={{ position: 'absolute', top: 0, left: 0, background: 'var(--accent)', padding: '6px 16px', color: 'black', fontSize: '0.75rem', letterSpacing: '0.15em', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', textTransform: 'uppercase', zIndex: 10 }}>
                    {badgeText}
                  </div>
                )}
              </div>
              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: isSpecial ? '2 1 400px' : 1, justifyContent: 'space-between', background: 'var(--surface)' }}>
                <div>
                  <h3 style={{ fontSize: isSpecial ? '2.4rem' : '2.1rem', margin: '0 0 16px 0', fontFamily: 'var(--font-titulo)', color: 'var(--text)', lineHeight: '1.1', textTransform: 'uppercase' }}>{post.title}</h3>
                  
                  {isSpecial && post.countdownDate && (
                    <Countdown targetDate={post.countdownDate} />
                  )}
                  
                  {post.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '0.9rem', marginTop: '12px', fontFamily: 'var(--font-ibm-mono)' }}>
                      <MapPin size={16} /> {post.location}
                    </div>
                  )}
                </div>
                
                <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: '1.6', marginTop: '16px' }}>{previewText}</p>

                <div style={{ alignSelf: 'flex-start', color: specialColor, fontFamily: 'var(--font-ibm-mono)', fontSize: '0.9rem', borderBottom: `1px solid ${specialColor}`, paddingBottom: '2px', marginTop: '24px' }}>
                  {t('landing.leerAhora')}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

    </>
  );
};

export const PublicationPage = () => {
  const { t, lang } = useLanguage();
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (id) {
      fetch(`/api/posts/${id}?lang=${lang}`)
        .then(res => res.json())
        .then(found => {
          if (!found.error) {
            if (found.type === 'simple' || found.type === 'aviso' || found.type === 'evento' || found.type === '3d_model') {
              setPost({ ...found, pages: [{ content: found.content || t('publicacion.sinContenido'), image: found.backgroundImage || found.image }] });
            } else {
              setPost(found);
            }
          }
        })
        .catch(console.error);
    }
  }, [id, lang]);

  if (!post) {
    return <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="animate-spin" style={{ width: '32px', height: '32px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>;
  }

  const next = () => setCurrentPage(prev => Math.min(prev + 1, post.pages.length - 1));
  const prev = () => setCurrentPage(prev => Math.max(prev - 1, 0));

  // El nombre del archivo puede traer paréntesis u otros caracteres que
  // rompen un url() sin comillas: el navegador descarta la declaración
  // entera y la publicación se queda sin ningún fondo. Entrecomillar y
  // codificar lo deja a salvo también para los archivos ya subidos, que
  // conservan el nombre con el que se guardaron.
  const fondo = post.pages?.[currentPage]?.image;
  const fondoCss = fondo ? `url("${encodeURI(fondo)}")` : null;

  const isAviso = post.type === 'aviso';
  const isEvento = post.type === 'evento';
  const isSpecial = isAviso || isEvento;
  const specialColor = isAviso ? 'var(--error)' : 'var(--accent)';

  return (
    <div style={{ 
      width: '100%', 
      color: 'var(--text)',
      // El velo sobre la imagen de fondo iba de 0.8 a 0.95, y a ese nivel la
      // foto no se distinguía del fondo plano: parecía que la publicación no
      // tenía imagen. 0.55/0.8 la deja verse manteniendo el texto blanco
      // legible encima. Si se sube de ahí, se vuelve a perder la foto.
      backgroundImage: (post.type !== '3d_model' && fondoCss) ? `linear-gradient(rgba(5,7,15,0.55), rgba(5,7,15,0.8)), ${fondoCss}` : 'none',
      backgroundColor: 'var(--background)',
      // Sin backgroundAttachment: 'fixed' a propósito. PageTransition (App.tsx)
      // anima este contenedor con un `filter: blur(...)`, y mientras ese filter
      // no es `none` el div se convierte en el bloque contenedor del fondo fixed
      // -- que entonces se pinta contra ESE div en vez de contra el viewport.
      // PageTransition ya limpia el filter al terminar la animación, pero para
      // entonces el navegador ya compositó la capa del fondo fixed contra la
      // caja equivocada, y quitar el filter no la fuerza a recalcularse: se
      // queda mal hasta que un scroll la repinta. `fixed` es la única causa
      // posible de este desajuste (un fondo con attachment normal siempre se
      // pinta contra su propia caja, sea cual sea el filter del antecesor), así
      // que se quita en vez de perseguir cada forma de invalidar el repintado.
      backgroundSize: 'cover', backgroundPosition: 'center',
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      position: 'relative'
    }}>
      {post.type === '3d_model' && post.modelUrl && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, backgroundColor: '#05070f' }}>
          <Suspense fallback={null}>
            <VisorModelo3D url={post.modelUrl} variante="publicacion" />
          </Suspense>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(5,7,15,0.95) 0%, rgba(5,7,15,0.2) 50%, rgba(5,7,15,0.95) 100%)', pointerEvents: 'none' }} />
        </div>
      )}
      {isSpecial && !post.pages?.[currentPage]?.image && (
        <motion.div 
          animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
            background: isAviso 
              ? 'radial-gradient(circle at center, var(--error-muted) 0%, transparent 60%)'
              : 'radial-gradient(circle at center, rgba(251,202,1,0.12) 0%, transparent 60%)',
          }}
        />
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, zIndex: 10, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 40px', borderBottom: `2px solid ${isSpecial ? specialColor : 'var(--border)'}`, alignItems: 'center', background: 'rgba(5,16,37,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', gap: '20px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="action-card logo-card" style={{ display: 'flex', alignItems: 'center', border: `0.6px solid ${isSpecial ? specialColor : 'var(--accent)'}`, padding: '8px 16px', gap: '12px', transition: 'all 0.3s ease' }}>
              <div className="logo-img-container">
                <img src={logoUrl} alt="Logo" className="logo-img-default" />
                <img src={logoBlancoUrl} alt="Logo Blanco" className="logo-img-hover" />
              </div>
              <div className="logo-text-container" style={{ color: 'white', fontFamily: 'var(--font-ibm-sans)', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '0.05em', lineHeight: 1.2, textAlign: 'left' }}>
                <div className="logo-text-default">RESEARCH UNIT<br />OF ROBOTICS</div>
                <div className="logo-text-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', color: isSpecial ? specialColor : 'var(--accent)' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>{t('nav.inicio')}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.5rem', transform: 'translateY(-3px)' }}>→</span>
                </div>
              </div>
            </div>
          </Link>

          <h2 style={{ margin: 0, color: isSpecial ? specialColor : 'var(--accent)', fontFamily: 'var(--font-titulo)', fontSize: '1.35rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '1px', flex: 1, justifyContent: 'center', textAlign: 'center' }}>
            {isSpecial && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: specialColor, animation: 'pulse 1.5s infinite' }}></div>}
            {post.title}
          </h2>
          <Link to="/" style={{ textDecoration: 'none', background: 'transparent', border: `1px solid ${isSpecial ? specialColor : 'var(--accent)'}`, color: isSpecial ? specialColor : 'var(--accent)', padding: '6px 16px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.9rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>{t('publicacion.volver')}</Link>
        </div>

        <div style={{ 
          flex: 1, 
          padding: isSpecial ? '40px 8%' : '60px', 
          maxWidth: isSpecial ? '100%' : '1200px', 
          margin: '0 auto', 
          width: '100%', 
          position: 'relative',
          display: 'block'
        }}>
           {/* Quién lo desarrolló. El perfil ya llevaba a sus proyectos; esto
               cierra el circuito en el otro sentido, que era lo que faltaba:
               desde el proyecto se llega a las personas. Quien no tiene
               perfil público se nombra igual, pero sin enlace a una página
               que no existe. */}
           {post.autores?.length > 0 && (
             <p className="creditos">
               <span className="creditos__etiqueta">{t('publicacion.desarrolladoPor')}</span>
               {post.autores.map((a: any, i: number) => (
                 <span key={a.id}>
                   {i > 0 && <span className="creditos__coma">, </span>}
                   {a.publico
                     ? <Link to={`/miembros/${a.id}`} className="creditos__persona">{a.nombre}</Link>
                     : <span className="creditos__persona creditos__persona--sin-perfil">{a.nombre}</span>}
                   {a.papel && <span className="creditos__papel"> · {a.papel}</span>}
                 </span>
               ))}
             </p>
           )}

           {isSpecial && post.countdownDate && (
             <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 50 }}>
               <Countdown targetDate={post.countdownDate} />
             </div>
           )}

           {post.location && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '1rem', marginTop: '16px', marginBottom: '24px', fontFamily: 'var(--font-ibm-mono)' }}>
               <MapPin size={20} style={{ color: specialColor }} /> {post.location}
             </div>
           )}

           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.6 }}
             style={{ width: '100%', height: '100%' }}
           >
              <div className="contenido-publicacion">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}>
                  {(post.pages && post.pages.length > 0) ? post.pages[currentPage].content : (post.content || '')}
                </ReactMarkdown>
              </div>
           </motion.div>
        </div>

      {post.pages && post.pages.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 60px', borderTop: '1px solid var(--border)', background: 'rgba(5,16,37,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <button onClick={prev} disabled={currentPage === 0} style={{ padding: '16px 32px', background: 'transparent', color: currentPage === 0 ? 'var(--muted)' : 'var(--text)', border: '1px solid var(--border)', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ibm-mono)' }}>{t('publicacion.anterior')}</button>
          <span style={{ fontFamily: 'var(--font-ibm-mono)', color: 'var(--accent)', letterSpacing: '4px', fontSize: '1.2rem' }}>
            {t('publicacion.pagina')} {currentPage + 1} / {post.pages.length}
          </span>
          <button onClick={next} disabled={currentPage === post.pages.length - 1} style={{ padding: '16px 32px', background: 'transparent', color: currentPage === post.pages.length - 1 ? 'var(--muted)' : 'var(--text)', border: '1px solid var(--border)', cursor: currentPage === post.pages.length - 1 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ibm-mono)' }}>{t('publicacion.siguiente')}</button>
        </div>
      )}
      </div>
    </div>
  );
};

export const ArchiveDashboard = () => {
  const { t, lang } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // 'all' y no 'todos': es el valor que llevan las <option> de los dos
  // desplegables, y compararlo contra otra palabra dejaba el filtro activo
  // desde el primer render, sin nada seleccionado que lo explicara.
  const [filterType, setFilterType] = useState('all');
  const [category, setCategory] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/posts?lang=${lang}`)
      .then(res => res.json())
      .then(data => {
        const sorted = data
          .filter((p: any) => !p.isHidden)
          .sort((a: any, b: any) => b.id - a.id);
        setPosts(sorted);
      })
      .catch(console.error);
  }, [lang]);

  const handlePostClick = (post: any) => {
    navigate(`/publicacion/${post.id}`);
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || post.type === filterType;
    // El desplegable de área existía y no filtraba nada: elegir "EXPLORA"
    // dejaba la misma lista de siempre.
    const matchesCategory = category === 'all' || (post.category || 'landing') === category;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
      <section className="portada">
        <div className="portada__marco portada__marco--seccion">
          {/* El archivo no tiene foto: el fondo es el azul institucional,
              que con el mismo velo y la misma viñeta se funde con la
              página igual que las portadas con imagen. */}
          <div className="portada__foto" style={{ backgroundColor: 'var(--surface-strong)' }} />
          <div className="portada__velo" />

          <div className="portada__texto portada__texto--marcado">
          <h1 style={{
            fontSize: '3.6rem',
            fontFamily: 'var(--font-titulo)',
            textTransform: 'uppercase',
            margin: '0 0 16px 0',
            color: 'var(--text)'
          }}>
            {t('archivo.titulo')}
          </h1>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--bone)',
            opacity: 0.9,
            lineHeight: '1.6'
          }}>
            {t('archivo.subtitulo')}
          </p>
          
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              style={{ background: 'var(--surface-strong)', color: 'var(--text)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: '4px', fontFamily: 'var(--font-ibm-mono)', outline: 'none' }}
            >
              <option value="all">{t('archivo.todasLasAreas')}</option>
              <option value="landing">{t('archivo.general')}</option>
              <option value="explora">{t('archivo.explora')}</option>
              <option value="descubre">{t('archivo.descubre')}</option>
              <option value="conecta">{t('archivo.conecta')}</option>
            </select>

            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ background: 'var(--surface-strong)', color: 'var(--text)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: '4px', fontFamily: 'var(--font-ibm-mono)', outline: 'none' }}
            >
              <option value="all">{t('archivo.todosLosFormatos')}</option>
              <option value="simple">{t('archivo.articulos')}</option>
              <option value="magazine">{t('archivo.revistas')}</option>
              <option value="evento">{t('archivo.eventosEspeciales')}</option>
            </select>
          </div>
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem', fontFamily: 'var(--font-ibm-mono)' }}>{t('archivo.sinResultados')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' }}>
            {filteredPosts.map(post => {
              const previewText = (post.type === 'simple' || post.type === 'aviso' || post.type === 'evento' || post.type === '3d_model')
                ? post.previewText || ''
                : t('archivo.previewMagazine');
              const isAviso = post.type === 'aviso';
              const isEvento = post.type === 'evento';
              const isSpecial = isAviso || isEvento;
              const specialColor = isAviso ? 'var(--error)' : 'var(--accent)';
              const is3D = post.type === '3d_model';
              const badgeText = post.type === 'magazine' ? t('archivo.revista') : isAviso ? t('archivo.aviso') : isEvento ? t('archivo.evento') : is3D ? '3D MODEL' : t('archivo.articulo');
              const BadgeIcon = isAviso ? TriangleAlert : isEvento ? Star : null;

              return (
                <motion.article 
                  key={post.id}
                  className="dashboard-card" 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true, amount: 0.1 }} 
                  whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}
                  whileTap={{ scale: 0.98 }} 
                  style={{ 
                    padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer',
                    border: 'none',
                    borderTop: isSpecial ? 'none' : '4px solid var(--accent)',
                    ...(isSpecial ? { '--linea-color': specialColor, '--linea-alto': '4px' } as React.CSSProperties : {}),
                    borderRadius: '0px',
                    background: 'var(--surface)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    position: 'relative'
                  }}
                  onClick={() => handlePostClick(post)}
                >
                  {isSpecial && <span className="linea-viva" aria-hidden="true" />}

                  <div style={{ width: '100%', aspectRatio: '16 / 9', backgroundColor: 'var(--surface-strong)', position: 'relative', overflow: 'hidden' }}>
                    {/* Mismo motivo que en la portada: con background-image el
                        navegador se descarga la imagen de cada tarjeta del
                        archivo aunque estén muy por debajo del pliegue. */}
                    {post.type === '3d_model' && post.modelUrl ? (
                      <div style={{ width: '100%', height: '100%', backgroundColor: '#101525', cursor: 'grab' }} onClick={(e) => e.stopPropagation()}>
                        <Suspense fallback={null}>
                          <VisorModelo3D url={post.modelUrl} variante="tarjeta" />
                        </Suspense>
                      </div>
                    ) : (
                      <motion.img
                        src={post.image || ''}
                        alt={post.title}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                    {isSpecial ? (
                      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: '4px', background: specialColor, padding: '4px 10px', borderRadius: '2px', border: 'none', color: isAviso ? 'white' : 'black', fontSize: '0.7rem', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {BadgeIcon && <BadgeIcon size={12} />} {badgeText}
                      </div>
                    ) : (
                      <div style={{ position: 'absolute', top: 0, left: 0, background: 'var(--accent)', padding: '6px 14px', color: 'black', fontSize: '0.75rem', letterSpacing: '0.15em', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', textTransform: 'uppercase', zIndex: 10 }}>
                        {badgeText}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.85rem', margin: '0 0 12px 0', fontFamily: 'var(--font-titulo)', color: isSpecial ? specialColor : 'var(--text)', lineHeight: '1.1', textTransform: 'uppercase' }}>{post.title}</h3>
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>{previewText}</p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
