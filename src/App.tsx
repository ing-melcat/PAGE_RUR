import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { lazyConRecarga, marcarArranqueCorrecto } from './lib/lazyConRecarga';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { MapPin, Phone, Mail, Menu, X, Languages } from 'lucide-react';
import logoUrl from './assets/isotipo.png';
import logoBlancoUrl from './assets/real_images/isotipo_blanco.png';
import imgMembers from './assets/real_images/rur-members1.jpeg';
import imgProjects from './assets/real_images/projects1.jpeg';
import imgDelivery from './assets/real_images/delivery.jpg';
import imgLumobox from './assets/real_images/lumobox.jpg';
import imgRassor from './assets/real_images/rassor1.jpeg';
import imgLine from './assets/real_images/line.jpeg';
// Carga diferida: arrastra livekit-client, que no tiene por qué pesar en el
// bundle de quien solo entra a la web pública.
const SpectatorApp = lazyConRecarga(() => import('./controller/SpectatorApp'));
const OverlayApp = lazyConRecarga(() => import('./controller/OverlayApp'));
const VisorModelo3D = lazyConRecarga(() => import('./VisorModelo3D'));
// Igual con el panel: arrastra el visor 3D de la selección de unidad, y con él
// three.js entero. Quien solo visita la web pública no tiene por qué cargarlo.
const LoginApp = lazyConRecarga(() => import('./LoginApp'));
import './App.css';
import { Landing, PublicationPage, ArchiveDashboard } from './Landing';
import { Miembros } from './Miembros';
import { PerfilMiembro } from './PerfilMiembro';
import ContactPage from './ContactPage';
import { useLanguage } from './lib/i18n';
import { EstadosActivos } from './components/EstadosActivos';
import { InvitacionEnVivo } from './components/InvitacionEnVivo';
import { PortadaSeccion } from './components/PortadaSeccion';

// --- ANIMACIONES DE TRANSICIÓN ---
const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Al acabar, framer deja `filter: blur(0px)` puesto, no `none`. Un filter
  // distinto de none convierte este div en bloque contenedor, y entonces el
  // `background-attachment: fixed` de la publicación deja de referirse al
  // viewport y pasa a referirse a este div, que mide toda la página. Con
  // `background-size: cover` la imagen se escalaba contra la caja
  // equivocada: se veía recortada o con otro encuadre hasta que un scroll
  // forzaba el repintado. Quitar el filter al terminar cierra el desajuste
  // sin renunciar al desenfoque de entrada.
  const limpiarFiltro = () => {
    if (ref.current) ref.current.style.filter = 'none';
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={limpiarFiltro}
    >
      {children}
    </motion.div>
  );
};

// --- COMPONENTE HOME (Página Principal) ---
function Home() {
  const { t } = useLanguage();
  const { scrollY } = useScroll();
  
  // Efectos Scrollytelling
  const bgScale = useTransform(scrollY, [0, 500], [1, 1.15]); // Fondo hace zoom al bajar
  // El texto se rezaga respecto al scroll. Antes bajaba 150px, que con la
  // foto a sangre acababan fuera de la ventana y no se veían; ahora el
  // marco recorta, así que un recorrido largo solo serviría para cortar el
  // titular contra el borde inferior. 60px bastan para el efecto.
  const textY = useTransform(scrollY, [0, 400], [0, 60]);
  const textOpacity = useTransform(scrollY, [0, 260], [1, 0]); // Texto se desvanece
  
  return (
    <>
      {/* Portada: la foto dentro del mismo margen que el resto de la página */}
      <section className="portada">
        <div className="portada__marco">
          <motion.div
            className="portada__foto"
            style={{ backgroundImage: `url(${imgMembers})`, scale: bgScale }}
          />
          <div className="portada__velo" />

          <motion.div className="portada__texto" style={{ y: textY, opacity: textOpacity }}>
          <span className="eyebrow eyebrow--hero" style={{ marginBottom: '16px', display: 'block' }}>

          </span>
          <h1 style={{ 
            fontSize: 'clamp(3rem, 9vw, 5.4rem)', 
            lineHeight: '1.1', 
            marginBottom: '24px', 
            textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            fontFamily: 'var(--font-titulo)',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            fontWeight: '400'
          }}>
            {t('home.heroTitulo')}
          </h1>
          <p style={{
            fontSize: 'clamp(1rem, 3vw, 1.25rem)',
            color: 'var(--bone)',
            opacity: 0.9,
            maxWidth: '600px',
            lineHeight: '1.6',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
          }}>
            {t('home.heroTexto')}
          </p>
          </motion.div>
        </div>
      </section>

      {/* Grid de Artículos */}
      <section className="main-content responsive-section" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-titulo)', fontSize: '1.9rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            <span style={{ color: 'var(--accent)' }}>/</span> {t('home.seccionTitulo')}
          </h2>
          <Link to="/archivo" style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', textDecoration: 'none', letterSpacing: '0.1em' }}>{t('home.verTodo')}</Link>
        </div>

        <Landing category="all" limit={6} />
      </section>
    </>
  );
}

// --- COMPONENTES PLACEHOLDER PARA LAS RUTAS ---
const Explora = () => {
  const { t } = useLanguage();
  return (
  <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
    <PortadaSeccion
      imagen={imgProjects}
      titulo={t('explora.heroTitulo')}
      texto={t('explora.heroTexto')}
    />

    {/* Contenido de Explora ahora es puramente dinámico a través de CMS */}
    <section className="responsive-section" style={{ backgroundColor: 'var(--background)', padding: '0 60px 60px 60px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-titulo)', fontSize: '1.9rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          <span style={{ color: 'var(--accent)' }}>/</span> {t('explora.seccionTitulo')}
        </h2>
      </div>
      <Landing category="explora" />
    </section>
  </div>
  );
};

const Descubre = () => {
  const { t } = useLanguage();
  return (
  <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
    <PortadaSeccion
      imagen={imgProjects}
      titulo={t('descubre.heroTitulo')}
      texto={t('descubre.heroTexto')}
    />

    {/* Contenido de Descubre ahora es dinámico a través de CMS */}
    <section className="responsive-section" style={{ backgroundColor: 'var(--background)', padding: '0 60px 60px 60px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-titulo)', fontSize: '1.9rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          <span style={{ color: 'var(--accent)' }}>/</span> {t('descubre.seccionTitulo')}
        </h2>
      </div>
      <Landing category="descubre" />
    </section>
  </div>
  );
};

const Conecta = () => {
  const { t } = useLanguage();
  return (
  <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
    <PortadaSeccion
      imagen={imgMembers}
      titulo={t('conecta.heroTitulo')}
      texto={t('conecta.heroTexto')}
      fotoAnimada
      tituloRevelado
    />

    {/* Contenido de Conecta ahora es dinámico a través de CMS */}
    <section className="responsive-section" style={{ backgroundColor: 'var(--background)', padding: '0 60px 60px 60px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-titulo)', fontSize: '1.9rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          <span style={{ color: 'var(--accent)' }}>/</span> {t('conecta.seccionTitulo')}
        </h2>
      </div>
      <Landing category="conecta" />
    </section>
  </div>
  );
};

// --- FOOTER COMPONENT ---
const Footer = () => {
  const { t } = useLanguage();
  return (
  <footer style={{
    backgroundColor: 'var(--background)',
    borderTop: '1px solid var(--accent)',
    padding: '60px 40px 20px',
    color: 'var(--muted)',
    fontFamily: 'var(--font-ibm-sans)'
  }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', marginBottom: '40px' }}>
      <div>
        <h4 style={{ color: 'var(--accent)', fontFamily: 'var(--font-titulo)', marginBottom: '20px', letterSpacing: '0.1em' }}>{t('footer.contacto')}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0' }}>
          <MapPin size={18} style={{ flexShrink: 0 }} /> <span style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>México 45, Los Encinos, 34307 Dgo., México</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0' }}>
          <Phone size={18} style={{ flexShrink: 0 }} />
          <Link to="/coming-soon" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>+52 (---) --- ----</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0' }}>
          <Mail size={18} style={{ flexShrink: 0 }} /> <Link to="/contacto" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>research.unit.robotics@gmail.com</Link>
        </div>
      </div>
      <div>
        <h4 style={{ color: 'var(--accent)', fontFamily: 'var(--font-titulo)', marginBottom: '20px', letterSpacing: '0.1em' }}>Comunidad</h4>
        <p style={{ margin: '12px 0' }}><a href="https://discord.gg/YCJxw6NfD" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Servidor de Discord</a></p>
        <p style={{ margin: '12px 0' }}><a href="#" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Grupo de WhatsApp</a></p>
        <p style={{ margin: '12px 0' }}><a href="#" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Foro RUR</a></p>
      </div>
      <div>
        <h4 style={{ color: 'var(--accent)', fontFamily: 'var(--font-titulo)', marginBottom: '20px', letterSpacing: '0.1em' }}>{t('footer.legal')}</h4>
        <p style={{ margin: '12px 0' }}><Link to="/coming-soon" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>{t('footer.avisoPrivacidad')}</Link></p>
        <p style={{ margin: '12px 0' }}><Link to="/coming-soon" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>{t('footer.terminos')}</Link></p>
        <p style={{ margin: '12px 0' }}><Link to="/coming-soon" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>{t('footer.cookies')}</Link></p>
      </div>
      <div>
        <h4 style={{ color: 'var(--accent)', fontFamily: 'var(--font-titulo)', marginBottom: '20px', letterSpacing: '0.1em' }}>{t('footer.social')}</h4>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link to="/coming-soon" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1.2rem', fontWeight: 'bold' }}>𝕏</Link>
          <Link to="/coming-soon" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1.2rem', fontWeight: 'bold' }}>in</Link>
          <a href="https://www.instagram.com/_ru.robotics?igsh=czd5bWg2dHpwNGJp" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1.2rem', fontWeight: 'bold' }}>IG</a>
        </div>
      </div>
    </div>
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', textAlign: 'center', fontSize: '0.8rem' }}>
      © {new Date().getFullYear()} Research Unit of Robotics - UNIPOLI Dgo. {t('footer.derechos')}
    </div>
  </footer>
  );
};

// --- LAYOUT DEL LANDING ---
const LandingLayout = () => {
  const { t, lang, setLang } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isPublication = location.pathname.startsWith('/publicacion/');


  return (
    <div className="app-shell" style={{ position: 'relative' }}>
      {/* Flota sobre el contenido de las páginas públicas. Va aquí y no en el
          router para que nunca aparezca en el espectador —quien ya está viendo
          la transmisión no necesita que le inviten— ni en el panel. */}
      <InvitacionEnVivo />
      
      {/* Navegación Superior. El reparto en tres columnas y el ajuste de
          línea los lleva App.css: dependen del ancho de la pantalla, y un
          style en línea no puede tener media queries. */}
      {!isPublication && (
      <header className="topbar" style={{
        borderBottom: '1px solid var(--border)',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px'
      }}>
        
        <div className="topbar-left" style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="action-card logo-card" style={{
              display: 'flex',
              alignItems: 'center',
              border: '0.6px solid var(--accent)',
              padding: '8px 16px',
              gap: '12px',
              transition: 'all 0.3s ease'
            }}>
              <div className="logo-img-container">
                <img 
                  src={logoUrl} 
                  alt="Logo UNIPOLI" 
                  className="logo-img-default"
                />
                <img 
                  src={logoBlancoUrl} 
                  alt="Logo UNIPOLI Blanco" 
                  className="logo-img-hover"
                />
              </div>
              <div className="logo-text-container" style={{
                color: 'white',
                fontFamily: 'var(--font-ibm-sans)',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                letterSpacing: '0.05em',
                lineHeight: 1.2,
                textAlign: 'left'
              }}>
                <div className="logo-text-default">
                  RESEARCH UNIT<br />OF ROBOTICS
                </div>
                <div className="logo-text-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>{t('nav.inicio')}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.5rem', transform: 'translateY(-3px)' }}>→</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
        
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '8px' }}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Enlaces de Navegación (Las palabras del centro) */}
        <nav className={`main-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{ textAlign: 'center', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
          <Link to="/explora" className="nav-link" data-text={t('nav.explora')} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.explora')}</Link>
          <span className="nav-separator" style={{ color: 'var(--muted)', opacity: 0.5 }}>•</span>
          <Link to="/descubre" className="nav-link" data-text={t('nav.descubre')} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.descubre')}</Link>
          <span className="nav-separator" style={{ color: 'var(--muted)', opacity: 0.5 }}>•</span>
          <Link to="/conecta" className="nav-link" data-text={t('nav.conecta')} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.conecta')}</Link>
          {/* Siempre presente, sin esperar a saber si hay alguien publicado.
              La condición se puso cuando no había ni un perfil y el enlace
              llevaba a una página vacía; ahora solo servía para que MIEMBROS
              apareciera un segundo tarde y empujara la barra, que es
              exactamente lo que acabábamos de arreglar. */}
          <span className="nav-separator" style={{ color: 'var(--muted)', opacity: 0.5 }}>•</span>
          <Link to="/miembros" className="nav-link" data-text={t('nav.miembros')} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.miembros')}</Link>


          {/* Mismos chips que en la barra de escritorio, no una variante
              propia: es la misma información y no tiene por qué verse de dos
              maneras distintas según el ancho de la pantalla. */}
          <div className="mobile-only-btn" style={{ marginTop: '20px' }}>
            <EstadosActivos alCerrarMenu={() => setIsMobileMenuOpen(false)} />
          </div>
          <button
            type="button"
            className="logout-btn-small mobile-only-btn"
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
          >
            <Languages size={14} /> {lang === 'es' ? 'EN' : 'ES'}
          </button>
          <Link to="/login" className="mobile-only-btn" style={{ textDecoration: 'none', marginTop: '10px' }} onClick={() => setIsMobileMenuOpen(false)}>
            <button className="logout-btn-small" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              {t('nav.acceder')}
            </button>
          </Link>
        </nav>

        <div className="topbar-right desktop-only-btn" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
          <EstadosActivos />
          <button
            type="button"
            className="logout-btn-small"
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            title={t('accesibilidad.idioma')}
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Languages size={14} /> {lang === 'es' ? 'EN' : 'ES'}
          </button>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button
              className="logout-btn-small"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              {t('nav.acceder')}
            </button>
          </Link>
        </div>
      </header>
      )}

      <main className="app-main">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

// --- COMPONENTE COMING SOON ---
const ComingSoon = () => {
  const { t } = useLanguage();
  return (
  <div style={{
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px',
    position: 'relative'
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, opacity: 0.5, pointerEvents: 'none' }}>
      <Suspense fallback={null}>
        <VisorModelo3D url="/models/DeliveryBotv1.glb" variante="publicacion" />
      </Suspense>
    </div>
    <div style={{ position: 'relative', zIndex: 10, background: 'rgba(3,8,22,0.7)', padding: '40px', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid var(--border)' }}>
      <h1 style={{ fontFamily: 'var(--font-titulo)', fontSize: '3.6rem', color: 'var(--accent)', marginBottom: '20px' }}>{t('comingSoon.titulo') || 'PRÓXIMAMENTE'}</h1>
      <p style={{ color: 'var(--text)', fontSize: '1.2rem', maxWidth: '600px', lineHeight: '1.6', margin: '0 auto' }}>
        {t('comingSoon.texto') || 'Estamos construyendo algo increíble en el laboratorio de robótica. ¡Vuelve pronto!'}
      </p>
      <Link to="/" style={{ marginTop: '40px', display: 'inline-block' }}>
        <button className="action-card" style={{
          background: 'var(--accent)',
          color: '#000',
          border: 'none',
          padding: '12px 32px',
          fontFamily: 'var(--font-ibm-mono)',
          fontWeight: 'bold',
          cursor: 'pointer',
          borderRadius: '4px',
          transition: 'all 0.3s ease'
        }}>
          {t('comingSoon.volver') || 'VOLVER AL INICIO'}
        </button>
      </Link>
    </div>
  </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const location = useLocation();

  // Si hemos llegado hasta aquí, el shell cargó bien: un fallo futuro de módulo
  // vuelve a tener derecho a su recarga automática.
  useEffect(() => {
    marcarArranqueCorrecto();
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith('/login')) {
      // La app ya no escribe NINGUNA de estas claves: el usuario se pide a
      // /api/me, el token de LiveKit vive solo en memoria y la navegación no
      // se persiste. Se siguen borrando para barrer lo que quedó en los
      // navegadores que cargaron una versión anterior; se puede quitar este
      // bloque dentro de unas semanas, cuando ya nadie arrastre esos restos.
      sessionStorage.removeItem('loginApp_view');
      sessionStorage.removeItem('loginApp_mainContext');
      sessionStorage.removeItem('loginApp_activeModule');
      sessionStorage.removeItem('loginApp_user');
      sessionStorage.removeItem('loginApp_livekitToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    }
  }, [location.pathname]);
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<LandingLayout />}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/explora" element={<PageTransition><Explora /></PageTransition>} />
          <Route path="/descubre" element={<PageTransition><Descubre /></PageTransition>} />
          <Route path="/conecta" element={<PageTransition><Conecta /></PageTransition>} />
          <Route path="/contacto" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route path="/miembros" element={<PageTransition><Miembros /></PageTransition>} />
          <Route path="/archivo" element={<PageTransition><ArchiveDashboard /></PageTransition>} />
          <Route path="/coming-soon" element={<PageTransition><ComingSoon /></PageTransition>} />
          <Route path="/publicacion/:id" element={<PageTransition><PublicationPage /></PageTransition>} />
          {/* El perfil de un miembro va en la raíz ("/member-1"), no bajo
              /miembros/, porque así lo pidió el usuario -- no le gustaba un
              id pelón ni un prefijo de sección delante. React Router v6
              rankea por especificidad, no por orden de declaración: una
              ruta estática como "/explora" siempre gana sobre esta aunque
              coincida el segmento, así que convivir aquí con el resto de
              rutas de un solo tramo es seguro. Solo "/member-<número>"
              entra -- lo valida el propio backend
              (services/identity/server.js) antes de tocar la base. */}
          <Route path="/:slug" element={<PageTransition><PerfilMiembro /></PageTransition>} />
        </Route>
        {/* Fuera de LandingLayout: ocupa la pantalla completa, sin cabecera
            ni pie. Es un enlace público que se le pasa a quien no tiene
            cuenta, así que no debe parecer parte del panel. */}
        <Route
          path="/espectador/:robotId"
          element={
            <Suspense fallback={null}>
              <PageTransition><SpectatorApp /></PageTransition>
            </Suspense>
          }
        />
        {/* Capa de datos para OBS. No es una página para visitar: se pega
            como Browser Source y se compone sobre el vídeo, así que va sin
            PageTransition — una animación de entrada se vería como un
            parpadeo del grafismo cada vez que OBS recarga la fuente. */}
        <Route
          path="/overlay/:robotId"
          element={
            <Suspense fallback={null}>
              <OverlayApp />
            </Suspense>
          }
        />
        <Route
          path="/login/*"
          element={
            <Suspense fallback={null}>
              <PageTransition><LoginApp /></PageTransition>
            </Suspense>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
