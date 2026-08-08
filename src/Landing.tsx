import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TriangleAlert, Star } from 'lucide-react';

import { useNavigate, useParams, Link } from 'react-router-dom';
import logoUrl from './assets/isotipo.png';
import logoBlancoUrl from './assets/real_images/isotipo_blanco.png';
import { sanitizeHtml } from './lib/sanitizeHtml';
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

export const Landing = ({ category = 'landing' }: { category?: string }) => {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter((p: any) => (p.category || 'landing') === category && !p.isHidden);
        const sorted = filtered.sort((a: any, b: any) => {
          const aIsSpecial = a.type === 'aviso' || a.type === 'evento';
          const bIsSpecial = b.type === 'aviso' || b.type === 'evento';
          if (aIsSpecial && !bIsSpecial) return -1;
          if (!aIsSpecial && bIsSpecial) return 1;
          return 0;
        });
        setPosts(sorted);
      })
      .catch(console.error);
  }, [category]);

  const handlePostClick = (post: any) => {
    navigate(`/publicacion/${post.id}`);
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))', gap: '40px' }}>
        {posts.map(post => {
          const previewText = post.type === 'simple'
            ? stripHtml(post.content).substring(0, 140) + '...'
            : t('landing.previewMagazine');
          const isAviso = post.type === 'aviso';
          const isEvento = post.type === 'evento';
          const isSpecial = isAviso || isEvento;
          const specialColor = isAviso ? 'var(--error)' : 'var(--accent)';
          const specialBg = isAviso ? 'rgba(255,68,68,0.3)' : 'rgba(251,202,1,0.3)';
          const badgeText = isAviso ? t('landing.avisoImportante') : t('landing.eventoEspecial');

          return (
            <motion.article 
              key={post.id}
              className="dashboard-card" 
              initial={{ opacity: 0, y: 40 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, amount: 0.1 }} 
              transition={{ duration: 0.6, ease: "easeOut" }} 
              whileHover={{ y: -10, boxShadow: isSpecial ? `0 20px 40px ${specialBg}` : '0 20px 40px rgba(0,0,0,0.5)' }} 
              style={{ 
                padding: 0, overflow: 'hidden', display: 'flex', flexDirection: isSpecial ? 'row' : 'column', flexWrap: 'wrap', cursor: 'pointer',
                gridColumn: isSpecial ? '1 / -1' : 'auto',
                border: isSpecial ? `2px solid ${specialColor}` : 'none'
              }}
              onClick={() => handlePostClick(post)}
            >
              <div style={{ flex: isSpecial ? '1 1 300px' : 'none', minWidth: isSpecial ? '280px' : '100%', height: isSpecial ? '100%' : '300px', minHeight: '300px', backgroundColor: isAviso ? '#2a0a0a' : isEvento ? '#251b03' : 'var(--surface-strong)', position: 'relative', overflow: 'hidden' }}>
                {post.type === '3d_model' && post.modelUrl ? (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#101525', cursor: 'grab' }} onClick={(e) => e.stopPropagation()}>
                    <Suspense fallback={null}>
                      <VisorModelo3D url={post.modelUrl} variante="tarjeta" />
                    </Suspense>
                  </div>
                ) : (
                  <motion.div
                    style={{ width: '100%', height: '100%', backgroundImage: `url(${post.image || ''})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: isSpecial ? 0.7 : 1 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                  />
                )}
                {post.type === 'magazine' && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--surface-strong)', padding: '6px 12px', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: '0.8rem', fontFamily: 'var(--font-ibm-mono)' }}>
                    {t('landing.revistaMultipagina')}
                  </div>
                )}
                {isSpecial && (
                  <div style={{ position: 'absolute', top: 16, left: 16, background: specialColor, padding: '8px 16px', color: isAviso ? 'white' : 'black', fontSize: '0.9rem', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isAviso ? 'white' : 'black', animation: 'pulse 1.5s infinite' }}></div>
                    {badgeText}
                  </div>
                )}
              </div>
              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: isSpecial ? '2 1 400px' : 1, justifyContent: 'space-between', background: isAviso ? 'linear-gradient(to right, #1a0505, var(--surface))' : isEvento ? 'linear-gradient(to right, #1f1a05, var(--surface))' : 'transparent' }}>
                <div>
                  <h3 style={{ fontSize: isSpecial ? '2rem' : '1.25rem', margin: '0 0 16px 0', fontFamily: 'var(--font-ibm-sans)', color: isSpecial ? specialColor : 'var(--text)' }}>{post.title}</h3>
                  
                  {isSpecial && post.countdownDate && (
                    <Countdown targetDate={post.countdownDate} />
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
  const { t } = useLanguage();
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        const found = data.find((p: any) => p.id.toString() === id?.toString());
        if (found) {
          if (found.type === 'simple' || found.type === 'aviso' || found.type === 'evento' || found.type === '3d_model') {
            setPost({ ...found, pages: [{ content: found.content || t('publicacion.sinContenido'), image: found.image }] });
          } else {
            setPost(found);
          }
        }
      });
  }, [id]);

  if (!post) {
    return <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="animate-spin" style={{ width: '32px', height: '32px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>;
  }

  const next = () => setCurrentPage(prev => Math.min(prev + 1, post.pages.length - 1));
  const prev = () => setCurrentPage(prev => Math.max(prev - 1, 0));

  const isAviso = post.type === 'aviso';
  const isEvento = post.type === 'evento';
  const isSpecial = isAviso || isEvento;
  const specialColor = isAviso ? 'var(--error)' : 'var(--accent)';
  const specialBg = isAviso ? 'rgba(255,68,68,0.1)' : 'rgba(251,202,1,0.1)';

  return (
    <div style={{ 
      width: '100%', 
      color: 'var(--text)',
      backgroundImage: (post.type !== '3d_model' && post.pages?.[currentPage]?.image) ? `linear-gradient(rgba(5,7,15,0.8), rgba(5,7,15,0.95)), url(${post.pages?.[currentPage]?.image})` : 'none',
      backgroundColor: 'var(--background)',
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 60px', borderBottom: `1px solid ${isSpecial ? specialColor : 'var(--border)'}`, alignItems: 'center', background: isSpecial ? specialBg : 'rgba(5,16,37,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', gap: '20px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="action-card logo-card" style={{ display: 'flex', alignItems: 'center', border: `0.6px solid ${isSpecial ? specialColor : 'var(--accent)'}`, padding: '4px 12px', gap: '12px', transition: 'all 0.3s ease' }}>
              <div className="logo-img-container">
                <img src={logoUrl} alt="Logo" className="logo-img-default" />
                <img src={logoBlancoUrl} alt="Logo Blanco" className="logo-img-hover" />
              </div>
              <div className="logo-text-container" style={{ color: 'white', fontFamily: 'var(--font-ibm-sans)', fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: '0.05em', lineHeight: 1.2, textAlign: 'left' }}>
                <div className="logo-text-default">RESEARCH UNIT<br />OF ROBOTICS</div>
                <div className="logo-text-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', color: isSpecial ? specialColor : 'var(--accent)' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>{t('nav.inicio')}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1rem', transform: 'translateY(-2px)' }}>→</span>
                </div>
              </div>
            </div>
          </Link>

          <h2 style={{ margin: 0, color: isSpecial ? specialColor : 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '1.1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '1px', flex: 1, justifyContent: 'center', textAlign: 'center' }}>
            {isSpecial && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: specialColor, animation: 'pulse 1.5s infinite' }}></div>}
            {post.title}
          </h2>
          <Link to="/" style={{ textDecoration: 'none', background: 'transparent', border: `1px solid ${isSpecial ? specialColor : 'var(--accent)'}`, color: isSpecial ? specialColor : 'var(--accent)', padding: '6px 16px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.9rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>{t('publicacion.volver')}</Link>
        </div>

        <div style={{ 
          flex: 1, 
          padding: isSpecial ? '0px' : '60px', 
          maxWidth: isSpecial ? '100%' : '1200px', 
          margin: '0 auto', 
          width: '100%', 
          position: 'relative',
          display: 'block'
        }}>
           {isSpecial && post.countdownDate && (
             <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 50 }}>
               <Countdown targetDate={post.countdownDate} />
             </div>
           )}

           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.6 }}
             style={{ width: '100%', height: '100%' }}
           >
             <div className="contenido-publicacion" dangerouslySetInnerHTML={{ __html: sanitizeHtml((post.pages && post.pages.length > 0) ? post.pages[currentPage].content : (post.content || '')) }} />
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
  const { t } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        const sorted = data
          .filter((p: any) => !p.isHidden)
          .sort((a: any, b: any) => b.id - a.id);
        setPosts(sorted);
      })
      .catch(console.error);
  }, []);

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
    const matchesType = filterType === 'todos' || post.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
      <section style={{ 
        position: 'relative', 
        height: '40vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        padding: '60px',
        overflow: 'hidden',
        borderBottom: '1px solid var(--accent)'
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#0a1a3a',
          filter: 'brightness(0.3)',
          zIndex: -1
        }}></div>
        
        <div style={{ maxWidth: '800px', borderLeft: '4px solid var(--accent)', paddingLeft: '24px' }}>
          <h1 style={{
            fontSize: '3rem',
            fontFamily: 'var(--font-ibm-mono)',
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
        </div>
      </section>

      <section className="responsive-section" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder={t('archivo.buscarPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: '1 1 300px', padding: '16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--font-ibm-mono)', fontSize: '1rem' }}
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ flex: '0 1 250px', padding: '16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--font-ibm-mono)', fontSize: '1rem' }}
          >
            <option value="todos">{t('archivo.todos')}</option>
            <option value="magazine">{t('archivo.revistas')}</option>
            <option value="simple">{t('archivo.articulosSimples')}</option>
            <option value="evento">{t('archivo.eventosEspeciales')}</option>
            <option value="aviso">{t('archivo.avisos')}</option>
          </select>
        </div>

        {filteredPosts.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-ibm-mono)' }}>
            {t('archivo.sinResultados')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' }}>
            {filteredPosts.map(post => {
              const previewText = post.type === 'simple'
                ? stripHtml(post.content).substring(0, 100) + '...'
                : t('archivo.previewMagazine');
              const isAviso = post.type === 'aviso';
              const isEvento = post.type === 'evento';
              const isSpecial = isAviso || isEvento;
              const specialColor = isAviso ? 'var(--error)' : 'var(--accent)';
              const specialBg = isAviso ? 'rgba(255,68,68,0.05)' : 'rgba(251,202,1,0.05)';
              const badgeText = post.type === 'magazine' ? t('archivo.revista') : isAviso ? t('archivo.aviso') : isEvento ? t('archivo.evento') : t('archivo.articulo');
              const BadgeIcon = isAviso ? TriangleAlert : isEvento ? Star : null;

              return (
                <motion.article 
                  key={post.id}
                  className="dashboard-card" 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true, amount: 0.1 }} 
                  whileHover={{ y: -5, boxShadow: isSpecial ? `0 10px 20px ${specialBg}` : '0 10px 20px rgba(0,0,0,0.5)' }} 
                  style={{ 
                    padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer',
                    border: isSpecial ? `2px solid ${specialColor}` : '1px solid var(--border)',
                    background: isSpecial ? specialBg : 'var(--surface)'
                  }}
                  onClick={() => handlePostClick(post)}
                >
                  <div style={{ width: '100%', height: '180px', backgroundColor: 'var(--surface-strong)', position: 'relative', overflow: 'hidden' }}>
                    <motion.div
                      style={{ width: '100%', height: '100%', backgroundImage: `url(${post.image || ''})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: isSpecial ? 0.8 : 1 }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.4 }}
                    />
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: '4px', background: isSpecial ? specialColor : 'rgba(5,7,15,0.8)', padding: '4px 10px', borderRadius: '4px', border: isSpecial ? 'none' : '1px solid var(--accent)', color: isSpecial ? (isAviso ? 'white' : 'black') : 'var(--accent)', fontSize: '0.7rem', fontFamily: 'var(--font-ibm-mono)', fontWeight: isSpecial ? 'bold' : 'normal' }}>
                      {BadgeIcon && <BadgeIcon size={12} />} {badgeText}
                    </div>
                  </div>
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', margin: '0 0 12px 0', fontFamily: 'var(--font-ibm-sans)', color: isSpecial ? specialColor : 'var(--text)' }}>{post.title}</h3>
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
