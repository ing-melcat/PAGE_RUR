import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { MapPin, Phone, Mail, Menu, X } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds, useGLTF } from '@react-three/drei';
import logoUrl from './assets/isotipo.png';
import logoBlancoUrl from './assets/real_images/isotipo_blanco.png';
import imgMembers from './assets/real_images/rur-members1.jpeg';
import imgProjects from './assets/real_images/projects1.jpeg';
import imgDelivery from './assets/real_images/delivery.jpg';
import imgLumobox from './assets/real_images/lumobox.jpg';
import imgRassor from './assets/real_images/rassor1.jpeg';
import imgLine from './assets/real_images/line.jpeg';
import LoginApp from './LoginApp';
import './App.css';

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
    fetch('http://localhost:3001/api/hello')
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
          <span className="eyebrow" style={{ color: 'var(--accent)', fontSize: '1rem', marginBottom: '16px', display: 'block' }}>
            
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
      <section className="main-content" style={{ padding: '60px', backgroundColor: 'var(--background)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '1.5rem', textTransform: 'uppercase' }}>
            <span style={{ color: 'var(--accent)' }}>/</span> Últimas Publicaciones
          </h2>
          <Link to="/explora" className="eyebrow" style={{ textDecoration: 'none' }}>Ver todo →</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          <motion.article className="dashboard-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.6, ease: "easeOut" }} whileHover={{ y: -10 }} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '220px', backgroundColor: 'var(--surface-strong)', backgroundImage: `url(${imgRassor})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div style={{ padding: '32px' }}>
              <span className="panel-label">Investigación</span>
              <h3 style={{ fontSize: '1.25rem', margin: '0 0 16px 0', fontFamily: 'var(--font-ibm-sans)' }}>Seguridad en Entornos Cloud</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
                Un análisis profundo sobre las nuevas normativas y arquitecturas de red.
              </p>
              <button className="action-card" style={{ padding: '12px' }}>About More</button>
            </div>
          </motion.article>

          <motion.article className="dashboard-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.6, ease: "easeOut" }} whileHover={{ y: -10 }} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '220px', backgroundColor: 'var(--surface-strong)', backgroundImage: `url(${imgLine})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div style={{ padding: '32px' }}>
              <span className="panel-label">Comunidad</span>
              <h3 style={{ fontSize: '1.25rem', margin: '0 0 16px 0', fontFamily: 'var(--font-ibm-sans)' }}>Hackathon 2026: Resultados</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
                Conoce a los equipos ganadores y los proyectos que revolucionarán el campus.
              </p>
              <button className="action-card" style={{ padding: '12px' }}>About More</button>
            </div>
          </motion.article>

          <motion.article className="dashboard-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.6, ease: "easeOut" }} whileHover={{ y: -10 }} style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid var(--accent)' }}>
            <span className="panel-label">Estado del Sistema</span>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 16px 0' }}>Conexión API</h3>
            <div className={`message ${apiMessage ? 'success' : 'error'}`} style={{ marginTop: 'auto' }}>
              {apiMessage ? '● CONECTADO: ' + apiMessage : '○ ESPERANDO CONEXIÓN...'}
            </div>
          </motion.article>
        </div>
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

    {/* Contenido de Explora */}
    <section style={{ padding: '60px', backgroundColor: 'var(--background)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
        
        {/* Tarjeta 1 */}
        <motion.article className="dashboard-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.6, ease: "easeOut" }} whileHover={{ y: -10 }} style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent' }}>
          <div style={{ height: '250px', backgroundImage: `url(${imgDelivery})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--border)' }}></div>
          <div style={{ padding: '24px 0' }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-ibm-mono)' }}>Robótica de Servicio</span>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 16px 0', fontFamily: 'var(--font-ibm-sans)' }}>DELIVER-E</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
              Robot autónomo que entrega snacks en la universidad. Solicita tu entrega desde la app móvil y recibe tus productos directo en tu salón de clases.
            </p>
            <button style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--text)', padding: '8px 16px', fontFamily: 'var(--font-ibm-mono)', cursor: 'pointer' }}>Leer Más</button>
          </div>
        </motion.article>

        {/* Tarjeta 2 */}
        <motion.article className="dashboard-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.6, ease: "easeOut" }} whileHover={{ y: -10 }} style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent' }}>
          <div style={{ height: '250px', backgroundImage: `url(${imgLumobox})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--border)' }}></div>
          <div style={{ padding: '24px 0' }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-ibm-mono)' }}>Inteligencia Artificial</span>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 16px 0', fontFamily: 'var(--font-ibm-sans)' }}>UMO AI & LUMOBOX</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
              Proyectos conceptualizados y desarrollados por el talento de RUR para llevar IA, interacción y hardware de vanguardia a escenarios reales.
            </p>
            <button style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--text)', padding: '8px 16px', fontFamily: 'var(--font-ibm-mono)', cursor: 'pointer' }}>Leer Más</button>
          </div>
        </motion.article>

      </div>
    </section>
  </div>
);

// Componente para cargar el modelo GLTF
function PrototypeModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

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
        <span className="eyebrow" style={{ color: 'var(--accent)', fontSize: '1rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>LABORATORIO VIRTUAL</span>
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

    <section style={{ padding: '60px', backgroundColor: 'var(--background)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '40px' }}>
        
        {/* BMO */}
        <motion.article className="dashboard-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.6, ease: "easeOut" }} whileHover={{ y: -10 }} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="canvas-container" style={{ height: '350px', backgroundColor: '#101525' }}>
            <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 4], fov: 50 }}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[5, 10, 5]} intensity={1.5} />
              <Suspense fallback={null}>
                <Bounds fit clip observe margin={1.5}>
                  <PrototypeModel url="/models/BMO.glb" />
                </Bounds>
              </Suspense>
              <OrbitControls makeDefault enableZoom={true} enablePan={false} />
            </Canvas>
          </div>
          <div style={{ padding: '24px' }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>ASISTENTE</span>
            <h3 style={{ fontSize: '1.5rem', margin: '8px 0 16px 0', fontFamily: 'var(--font-ibm-sans)' }}>BMO</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Prototipo de robot asistente inspirado en diseño retro.</p>
          </div>
        </motion.article>

        {/* Delivery Bot */}
        <motion.article className="dashboard-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.6, ease: "easeOut" }} whileHover={{ y: -10 }} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="canvas-container" style={{ height: '350px', backgroundColor: '#101525' }}>
            <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 4], fov: 50 }}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[5, 10, 5]} intensity={1.5} />
              <Suspense fallback={null}>
                <Bounds fit clip observe margin={1.5}>
                  <PrototypeModel url="/models/DeliveryBotv1.glb" />
                </Bounds>
              </Suspense>
              <OrbitControls makeDefault enableZoom={true} enablePan={false} />
            </Canvas>
          </div>
          <div style={{ padding: '24px' }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>LOGÍSTICA</span>
            <h3 style={{ fontSize: '1.5rem', margin: '8px 0 16px 0', fontFamily: 'var(--font-ibm-sans)' }}>Delivery Bot v1</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Vehículo autónomo para entrega de suministros dentro del campus.</p>
          </div>
        </motion.article>

        {/* Leo Rover */}
        <motion.article className="dashboard-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.6, ease: "easeOut" }} whileHover={{ y: -10 }} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="canvas-container" style={{ height: '350px', backgroundColor: '#101525' }}>
            <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 4], fov: 50 }}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[5, 10, 5]} intensity={1.5} />
              <Suspense fallback={null}>
                <Bounds fit clip observe margin={1.5}>
                  <PrototypeModel url="/models/leo_rover.glb" />
                </Bounds>
              </Suspense>
              <OrbitControls makeDefault enableZoom={true} enablePan={false} />
            </Canvas>
          </div>
          <div style={{ padding: '24px' }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>EXPLORACIÓN</span>
            <h3 style={{ fontSize: '1.5rem', margin: '8px 0 16px 0', fontFamily: 'var(--font-ibm-sans)' }}>Leo Rover</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Plataforma robótica robusta para terrenos difíciles e investigación.</p>
          </div>
        </motion.article>

        {/* Unipolito */}
        <motion.article className="dashboard-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.6, ease: "easeOut" }} whileHover={{ y: -10 }} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="canvas-container" style={{ height: '350px', backgroundColor: '#101525' }}>
            <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 4], fov: 50 }}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[5, 10, 5]} intensity={1.5} />
              <Suspense fallback={null}>
                <Bounds fit clip observe margin={1.5}>
                  <PrototypeModel url="/models/unipolitov4.glb" />
                </Bounds>
              </Suspense>
              <OrbitControls makeDefault enableZoom={true} enablePan={false} />
            </Canvas>
          </div>
          <div style={{ padding: '24px' }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>MASCOTA INSTITUCIONAL</span>
            <h3 style={{ fontSize: '1.5rem', margin: '8px 0 16px 0', fontFamily: 'var(--font-ibm-sans)' }}>Unipolito v4</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Cuarta iteración del modelo oficial de nuestra unidad de robótica.</p>
          </div>
        </motion.article>

      </div>
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
        <span className="eyebrow" style={{ color: 'var(--accent)', fontSize: '1rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>ALIANZAS GLOBALES</span>
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

    <section style={{ padding: '80px 40px', backgroundColor: 'var(--background)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '60px' }}>
        
        {/* UCF Collab */}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px', height: '300px', backgroundImage: `url(${imgProjects})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--border)' }}></div>
          <div style={{ flex: '1 1 400px' }}>
            <h2 style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '2rem', color: 'var(--accent)', marginBottom: '16px' }}>UCF</h2>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>University of Central Florida</h3>
            <p style={{ color: 'var(--muted)', lineHeight: '1.7', marginBottom: '24px' }}>
              Nuestra colaboración estratégica con la UCF permite el intercambio de investigadores y el desarrollo conjunto de programas de inteligencia artificial. Juntos, estamos creando el futuro de la educación tecnológica.
            </p>
            <button style={{ background: 'var(--accent)', color: 'var(--background)', border: 'none', padding: '10px 20px', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', cursor: 'pointer' }}>VER PROYECTOS</button>
          </div>
        </div>

        {/* Florida Space Institute Collab */}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap', flexDirection: 'row-reverse' }}>
          <div style={{ flex: '1 1 400px', height: '300px', backgroundImage: `url(${imgLine})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--border)' }}></div>
          <div style={{ flex: '1 1 400px' }}>
            <h2 style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '2rem', color: 'var(--accent)', marginBottom: '16px' }}>FSI</h2>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Florida Space Institute</h3>
            <p style={{ color: 'var(--muted)', lineHeight: '1.7', marginBottom: '24px' }}>
              Trabajamos de la mano con la Universidad Espacial de Florida para simular entornos marcianos y desarrollar tecnología de punta en sensores robóticos espaciales.
            </p>
            <button style={{ background: 'var(--accent)', color: 'var(--background)', border: 'none', padding: '10px 20px', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', cursor: 'pointer' }}>LEER REPORTAJE</button>
          </div>
        </div>

      </div>
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

  return (
    <div className="app-shell" style={{ position: 'relative' }}>
      
      {/* Navegación Superior */}
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
          
          {/* El botón de acceder también va en el menú móvil para que no se amontone arriba */}
          <Link to="/login" className="mobile-only-btn" style={{ textDecoration: 'none', marginTop: '20px' }} onClick={() => setIsMobileMenuOpen(false)}>
            <button className="logout-btn-small" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              ACCEDER
            </button>
          </Link>
        </nav>
        
        <div className="topbar-right desktop-only-btn" style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<LandingLayout />}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/explora" element={<PageTransition><Explora /></PageTransition>} />
          <Route path="/descubre" element={<PageTransition><Descubre /></PageTransition>} />
          <Route path="/conecta" element={<PageTransition><Conecta /></PageTransition>} />
          <Route path="/coming-soon" element={<PageTransition><ComingSoon /></PageTransition>} />
        </Route>
        <Route path="/login/*" element={<PageTransition><LoginApp /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
