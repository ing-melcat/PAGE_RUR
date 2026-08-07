import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { lazyConRecarga, marcarArranqueCorrecto } from './lib/lazyConRecarga';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { MapPin, Phone, Mail, Menu, X } from 'lucide-react';
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
// Igual con el panel: arrastra el visor 3D de la selección de unidad, y con él
// three.js entero. Quien solo visita la web pública no tiene por qué cargarlo.
const LoginApp = lazyConRecarga(() => import('./LoginApp'));
import './App.css';
import { Landing, PublicationPage, ArchiveDashboard } from './Landing';

// --- ANIMACIONES DE TRANSICIÓN ---
const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

// --- COMPONENTE HOME (Página Principal) ---
function Home() {
  const { scrollY } = useScroll();
  
  // Efectos Scrollytelling
  const bgScale = useTransform(scrollY, [0, 500], [1, 1.15]); // Fondo hace zoom al bajar
  const textY = useTransform(scrollY, [0, 400], [0, 150]);    // Texto baja a menor velocidad (parallax)
  const textOpacity = useTransform(scrollY, [0, 300], [1, 0]); // Texto se desvanece
  
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    fetch('/api/hello')
      .then((response) => response.json())
      .then((data) => setApiMessage(data.message))
      .catch((error) => console.error('Error conectando al backend:', error));
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        height: '75vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-end',
        padding: '60px',
        overflow: 'hidden'
      }}>
        <motion.div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `url(${imgMembers})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.5) contrast(1.2)',
          zIndex: -1,
          scale: bgScale
        }}></motion.div>

        <motion.div style={{ maxWidth: '800px', y: textY, opacity: textOpacity }}>
          <span className="eyebrow eyebrow--hero" style={{ marginBottom: '16px', display: 'block' }}>
            
          </span>
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', 
            lineHeight: '1.1', 
            marginBottom: '24px', 
            textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            fontFamily: 'var(--font-ibm-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            fontWeight: '600'
          }}>
            El Futuro de la Tecnología
          </h1>
          <p style={{ 
            fontSize: 'clamp(1rem, 3vw, 1.25rem)', 
            color: 'var(--bone)', 
            opacity: 0.9, 
            maxWidth: '600px',
            lineHeight: '1.6',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
          }}>
            Dedicados a avanzar las tecnologías robóticas mediante experimentación práctica, diseño colaborativo e innovación interdisciplinaria. Construyendo soluciones escalables para la industria y academia.
          </p>
        </motion.div>
      </section>

      {/* Grid de Artículos */}
      <section className="main-content responsive-section" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '1.5rem', textTransform: 'uppercase' }}>
            <span style={{ color: 'var(--accent)' }}>/</span> Últimas Publicaciones
          </h2>
          <Link to="/archivo" style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', textDecoration: 'none', letterSpacing: '0.1em' }}>VER TODO →</Link>
        </div>

        <Landing />
      </section>
    </>
  );
}

// --- COMPONENTES PLACEHOLDER PARA LAS RUTAS ---
const Explora = () => (
  <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
    {/* Hero de Explora */}
    <section style={{ 
      position: 'relative', 
      height: '50vh', 
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
        backgroundImage: `url(${imgProjects})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.3) grayscale(0.5)',
        zIndex: -1
      }}></div>
      
      <div style={{ maxWidth: '800px', borderLeft: '4px solid var(--accent)', paddingLeft: '24px' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          fontFamily: 'var(--font-ibm-mono)',
          textTransform: 'uppercase',
          margin: '0 0 16px 0',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)'
        }}>
          Explora lo Desconocido
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: 'var(--bone)', 
          opacity: 0.9, 
          maxWidth: '600px',
          lineHeight: '1.6'
        }}>
          Sumérgete en la frontera del conocimiento. Desde misiones análogas espaciales hasta robótica avanzada.
        </p>
      </div>
    </section>

    {/* Contenido de Explora ahora es puramente dinámico a través de CMS */}
    <section className="responsive-section" style={{ backgroundColor: 'var(--background)', padding: '0 60px 60px 60px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '1.5rem', textTransform: 'uppercase' }}>
          <span style={{ color: 'var(--accent)' }}>/</span> Más Novedades de Exploración
        </h2>
      </div>
      <Landing category="explora" />
    </section>
  </div>
);

const Descubre = () => (
  <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
    <section style={{ 
      position: 'relative', 
      height: '50vh', 
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
        backgroundImage: `url(${imgProjects})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.3) grayscale(0.5)',
        zIndex: -1
      }}></div>
      <div style={{ maxWidth: '800px', borderLeft: '4px solid var(--accent)', paddingLeft: '24px' }}>
        <span className="eyebrow eyebrow--hero" style={{ textTransform: 'uppercase' }}>LABORATORIO VIRTUAL</span>
        <h1 style={{ 
          fontSize: '3.5rem', 
          fontFamily: 'var(--font-ibm-mono)',
          textTransform: 'uppercase',
          margin: '8px 0 16px 0',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)'
        }}>
          Prototipos 3D
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: 'var(--bone)', 
          opacity: 0.9, 
          maxWidth: '600px',
          lineHeight: '1.6'
        }}>
          Interactúa con los modelos tridimensionales de nuestros desarrollos. Arrastra para rotar y usa el scroll para acercar.
        </p>
      </div>
    </section>

    {/* Contenido de Descubre ahora es dinámico a través de CMS */}
    <section className="responsive-section" style={{ backgroundColor: 'var(--background)', padding: '0 60px 60px 60px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '1.5rem', textTransform: 'uppercase' }}>
          <span style={{ color: 'var(--accent)' }}>/</span> Bitácora del Laboratorio
        </h2>
      </div>
      <Landing category="descubre" />
    </section>
  </div>
);

const Conecta = () => (
  <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
    <section style={{ 
      position: 'relative', 
      height: '50vh', 
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
        backgroundImage: `url(${imgMembers})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.3) grayscale(0.5)',
        zIndex: -1,
        animation: 'kenBurns 20s infinite alternate ease-in-out'
      }}></div>
      <div style={{ maxWidth: '800px', borderLeft: '4px solid var(--accent)', paddingLeft: '24px' }}>
        <span className="eyebrow eyebrow--hero" style={{ textTransform: 'uppercase' }}>ALIANZAS GLOBALES</span>
        <h1 style={{ 
          fontSize: '3.5rem', 
          fontFamily: 'var(--font-ibm-mono)',
          textTransform: 'uppercase',
          margin: '8px 0 16px 0',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)'
        }}>
          <span className="text-reveal-mask">
            <span>Conecta con el Mundo</span>
          </span>
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: 'var(--bone)', 
          opacity: 0.9, 
          maxWidth: '600px',
          lineHeight: '1.6'
        }}>
          Nuestra red de colaboraciones internacionales impulsa el desarrollo tecnológico más allá de las fronteras.
        </p>
      </div>
    </section>

    {/* Contenido de Conecta ahora es dinámico a través de CMS */}
    <section className="responsive-section" style={{ backgroundColor: 'var(--background)', padding: '0 60px 60px 60px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '1.5rem', textTransform: 'uppercase' }}>
          <span style={{ color: 'var(--accent)' }}>/</span> Actualizaciones de la Red
        </h2>
      </div>
      <Landing category="conecta" />
    </section>
  </div>
);

// --- FOOTER COMPONENT ---
const Footer = () => (
  <footer style={{
    backgroundColor: 'var(--background)',
    borderTop: '1px solid var(--accent)',
    padding: '60px 40px 20px',
    color: 'var(--muted)',
    fontFamily: 'var(--font-ibm-sans)'
  }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', marginBottom: '40px' }}>
      <div>
        <h4 style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', marginBottom: '20px', letterSpacing: '0.1em' }}>CONTACTO</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0' }}>
          <MapPin size={18} style={{ flexShrink: 0 }} /> <span style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>México 45, Los Encinos, 34307 Dgo., México</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0' }}>
          <Phone size={18} style={{ flexShrink: 0 }} /> 
          <Link to="/coming-soon" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>+52 (---) --- ----</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0' }}>
          <Mail size={18} style={{ flexShrink: 0 }} /> <span style={{ fontSize: '0.9rem' }}>research.unit.robotics@gmail.com</span>
        </div>
      </div>
      <div>
        <h4 style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', marginBottom: '20px', letterSpacing: '0.1em' }}>LEGAL</h4>
        <p style={{ margin: '12px 0' }}><Link to="/coming-soon" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Aviso de Privacidad</Link></p>
        <p style={{ margin: '12px 0' }}><Link to="/coming-soon" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Términos y Condiciones</Link></p>
        <p style={{ margin: '12px 0' }}><Link to="/coming-soon" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Política de Cookies</Link></p>
      </div>
      <div>
        <h4 style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', marginBottom: '20px', letterSpacing: '0.1em' }}>SOCIAL</h4>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link to="/coming-soon" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1.2rem', fontWeight: 'bold' }}>𝕏</Link>
          <Link to="/coming-soon" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1.2rem', fontWeight: 'bold' }}>in</Link>
          <a href="https://www.instagram.com/_ru.robotics?igsh=czd5bWg2dHpwNGJp" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1.2rem', fontWeight: 'bold' }}>IG</a>
        </div>
      </div>
    </div>
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', textAlign: 'center', fontSize: '0.8rem' }}>
      © {new Date().getFullYear()} Research Unit of Robotics - UNIPOLI Dgo. Todos los derechos reservados.
    </div>
  </footer>
);

// --- LAYOUT DEL LANDING ---
const LandingLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSpecial, setActiveSpecial] = useState<'aviso' | 'evento' | null>(null);
  const location = useLocation();
  const isPublication = location.pathname.startsWith('/publicacion/');

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        const special = data.find((p: any) => p.type === 'aviso' || p.type === 'evento');
        setActiveSpecial(special ? special.type : null);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="app-shell" style={{ position: 'relative' }}>
      
      {/* Navegación Superior */}
      {!isPublication && (
      <header className="topbar" style={{ 
        borderBottom: '1px solid var(--border)', 
        padding: '20px 40px',
        display: 'flex',
        flexWrap: 'wrap',
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
                  <span style={{ display: 'flex', alignItems: 'center' }}>INICIO</span>
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
          <Link to="/explora" className="nav-link" data-text="EXPLORA" onClick={() => setIsMobileMenuOpen(false)}>EXPLORA</Link>
          <span className="nav-separator" style={{ color: 'var(--muted)', opacity: 0.5 }}>•</span>
          <Link to="/descubre" className="nav-link" data-text="DESCUBRE" onClick={() => setIsMobileMenuOpen(false)}>DESCUBRE</Link>
          <span className="nav-separator" style={{ color: 'var(--muted)', opacity: 0.5 }}>•</span>
          <Link to="/conecta" className="nav-link" data-text="CONECTA" onClick={() => setIsMobileMenuOpen(false)}>CONECTA</Link>
          
          {/* El botón de acceder y el aviso van en el menú móvil para que no se amontone arriba */}
          {activeSpecial && (
            <div className="mobile-only-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: activeSpecial === 'aviso' ? 'var(--error)' : 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '20px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: activeSpecial === 'aviso' ? 'var(--error)' : 'var(--accent)', animation: 'pulse 1.5s infinite' }}></div>
              {activeSpecial === 'aviso' ? 'AVISO ACTIVO' : 'EVENTO ACTIVO'}
            </div>
          )}
          <Link to="/login" className="mobile-only-btn" style={{ textDecoration: 'none', marginTop: activeSpecial ? '10px' : '20px' }} onClick={() => setIsMobileMenuOpen(false)}>
            <button className="logout-btn-small" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              ACCEDER
            </button>
          </Link>
        </nav>
        
        <div className="topbar-right desktop-only-btn" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
          {activeSpecial && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: activeSpecial === 'aviso' ? 'var(--error)' : 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', fontWeight: 'bold' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: activeSpecial === 'aviso' ? 'var(--error)' : 'var(--accent)', animation: 'pulse 1.5s infinite' }}></div>
              {activeSpecial === 'aviso' ? 'AVISO ACTIVO' : 'EVENTO ACTIVO'}
            </div>
          )}
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button 
              className="logout-btn-small" 
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              ACCEDER
            </button>
          </Link>
        </div>
      </header>
      )}

      <Outlet />
      
      <Footer />
    </div>
  );
};

// --- COMPONENTE COMING SOON ---
const ComingSoon = () => (
  <div style={{ 
    height: '60vh', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px'
  }}>
    <h1 style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '3rem', color: 'var(--accent)', marginBottom: '20px' }}>PROXIMAMENTE</h1>
    <p style={{ color: 'var(--muted)', fontSize: '1.2rem', maxWidth: '600px', lineHeight: '1.6' }}>
      Esta sección aún está en desarrollo. ¡Mantente atento a nuestras redes para futuras actualizaciones!
    </p>
    <Link to="/" style={{ marginTop: '40px' }}>
      <button style={{ 
        background: 'transparent', 
        color: 'var(--accent)', 
        border: '1px solid var(--accent)', 
        padding: '12px 24px', 
        fontFamily: 'var(--font-ibm-mono)', 
        fontWeight: 'bold', 
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}>
        VOLVER AL INICIO
      </button>
    </Link>
  </div>
);

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
          <Route path="/archivo" element={<PageTransition><ArchiveDashboard /></PageTransition>} />
          <Route path="/coming-soon" element={<PageTransition><ComingSoon /></PageTransition>} />
          <Route path="/publicacion/:id" element={<PageTransition><PublicationPage /></PageTransition>} />
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
