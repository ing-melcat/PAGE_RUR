import React, { useState, useEffect, Suspense, lazy } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Loader2, CheckCircle } from "lucide-react";
import "./index.css";
import { RobotSelection } from "./controller/RobotSelection";

const ControllerApp = lazy(() => import("./controller/ControllerApp"));

// --- SOCIAL ICONS ---
const GithubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const RedditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M16 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path>
    <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path>
    <path d="M12 15s1.5 2 4 2"></path>
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const ConsoleIcon = ({ size = 22, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 14c0 3 2 4 4 4h12c2 0 4-1 4-4V9c0-2-1-3-3-3H5C3 6 2 7 2 9v5z" />
    <rect x="7" y="8" width="10" height="4" rx="1" />
    <path d="M5.5 13.5v2m-1-1h2" />
    <circle cx="17" cy="14.5" r="0.5" fill={color} />
    <circle cx="18.5" cy="13" r="0.5" fill={color} />
    <path d="M6 6l-1-2" />
    <path d="M18 6l1-2" />
  </svg>
);

// --- CUSTOM ROBOTICS ICONS ---
const TechGearIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 4v2m0 12v2M4 12h2m12 0h2" />
    <path d="M6.34 6.34l1.41 1.41m8.49 8.49l1.41 1.41M6.34 17.66l1.41-1.41m8.49-8.49l1.41-1.41" />
    <circle cx="12" cy="12" r="8" strokeDasharray="2 3" />
  </svg>
);

const BlueprintUserIcon = ({ size = 42, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="bevel">
    <path d="M7 8l5-3 5 3v6l-5 3-5-3V8z" />
    <path d="M9 10h6v2H9z" />
    <path d="M4 22v-3l4-4h8l4 4v3" />
    <path d="M12 17v5" strokeDasharray="2 2" />
    <circle cx="12" cy="5" r="1" fill={color} />
  </svg>
);

const RoboGreetingIcon = ({ size = 56, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <path d="M3 22l4-7h5" />
    <path d="M12 15l4-5-2-4" />
    <path d="M12 15l5 2 2-4" />
    <circle cx="7" cy="15" r="1.5" />
    <circle cx="12" cy="15" r="1.5" />
    <path d="M15 5a3 3 0 0 1 3 3" strokeDasharray="1 2" />
    <path d="M17 3a5 5 0 0 1 5 5" strokeDasharray="1 3" />
  </svg>
);
// -----------------------------

const adminActions = [
  { title: "Gestión de Usuarios", view: "admin_users" },
  { title: "Logs Generales", view: "admin_logs" },
  { title: "Consola del Operador", view: "controles" }
];

const operadorActions = [
  { title: "Consola del Operador", view: "controles" }
];


export default function App() {
  const [view, setView] = useState("login");
  const [user, setUser] = useState<any>(null);
  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mainContext, setMainContext] = useState("modules");
  const [activeModule, setActiveModule] = useState<any>(null);
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [profileForm, setProfileForm] = useState({ alias: '', bio: '', foto: '', github: '', instagram: '', reddit: '', facebook: '' });
  
  const [showAlias, setShowAlias] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      setShowAlias(user.show_alias ?? true);
      setPushNotifications(user.push_notifications ?? false);
    }
  }, [user]);

  // Robots State para LiveKit
  const [robots, setRobots] = useState([
    { id: "rassor-1", name: "RASSOR Alpha", status: "online", room: "room-rassor-1", modelUrl: "" },
    { id: "rassor-2", name: "RASSOR Beta", status: "online", room: "room-rassor-2", modelUrl: "" },
    { id: "rassor-3", name: "RASSOR Gamma", status: "offline", room: "room-rassor-3", modelUrl: "" }
  ]);
  const [editingRobot, setEditingRobot] = useState<any>(null);

  const handleSaveRobot = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedRobot = {
        id: formData.get('id'),
        name: formData.get('name'),
        room: formData.get('room'),
        status: formData.get('status'),
        modelUrl: formData.get('modelUrl') || "",
    };

    if (editingRobot.isNew) {
        setRobots([...robots, updatedRobot]);
    } else {
        setRobots(robots.map(r => r.id === editingRobot.id ? updatedRobot : r));
    }
    setEditingRobot(null);
  };

  // Accessibility State
  const [largeText, setLargeText] = useState(false);
  const [reduceAnimations, setReduceAnimations] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("large-text", largeText);
  }, [largeText]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // --- BYPASS DE LOGIN TEMPORAL PARA PRUEBAS ---
    setTimeout(() => {
      setUser({
        matricula: matricula || "admin",
        nombre: "Usuario de Pruebas",
        grupo: "Sistemas",
        telefono: "555-0000",
        rol: "admin",
        show_alias: false,
        push_notifications: false,
        alias: "",
        bio: "",
        foto: "",
        github: "",
        instagram: "",
        reddit: "",
        facebook: "",
        control_mappings: {}
      });
      setView("welcome");
      setTimeout(() => {
        setView((currentView) => currentView === "welcome" ? "dashboard" : currentView);
      }, 2200);
      setIsLoading(false);
    }, 500);
    return;
    // --- FIN DEL BYPASS ---

    try {
      const response = await fetch('/api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula, password })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setUser(data.user);
        setView("welcome");
        setTimeout(() => {
          setView((currentView) => currentView === "welcome" ? "dashboard" : currentView);
        }, 2200);
      } else {
        setError(data.message || "Credenciales incorrectas.");
      }
    } catch (err) {
      setError("Error interno.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setMatricula("");
    setPassword("");
    setView("login");
  };

  const pageTransition = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.3 }
  };

  return (
    <MotionConfig reducedMotion={reduceAnimations ? "always" : "user"}>
      <div className="app-shell">
      {view !== "controles" && (
      <header className="topbar">
        <div className="topbar-left">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="RUR Logo" className="topbar-logo" />
        </div>
        <div className="topbar-title">RESEARCH UNIT OF ROBOTICS</div>
        <div className="topbar-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div 
            className="topbar-icon" 
            aria-hidden="true"
            onClick={() => {
              if (user && view === "dashboard") {
                setMainContext("settings");
              } else {
                setView("settings_menu");
              }
            }}
            title="Ajustes"
          >
            <TechGearIcon />
          </div>
          {user && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={logout} 
              className="logout-btn-small"
            >
              Salir
            </motion.button>
          )}
        </div>
      </header>
      )}

      <main className={view === "login" ? "container" : "full-container"} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.section key="login" className="login-panel" {...pageTransition}>
              <div className="panel-header">
                <span className="panel-label">Completar datos</span>
                <h1>Acceso al Sistema</h1>
              </div>
              <form onSubmit={handleLogin} autoComplete="off">
                <div className="input-group">
                  <label htmlFor="matricula">Matrícula</label>
                  <input 
                    type="text" 
                    id="matricula" 
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="INGRESAR MATRÍCULA" 
                    required 
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="password">Código de Acceso</label>
                  <input 
                    type="password" 
                    id="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********" 
                    required 
                  />
                </div>

                <button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Iniciar Sesión"}
                </button>
                {error && <p className="message error">{error}</p>}
              </form>
            </motion.section>
          )}

          {view === "welcome" && user && (
            <motion.section 
              key="welcome" 
              className="dashboard-card" 
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto', textAlign: 'center', background: 'transparent', border: 'none' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center', color: 'var(--accent)' }}
                >
                  <RoboGreetingIcon size={96} />
                </motion.div>
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  style={{ color: 'var(--accent)', margin: '0 0 12px 0', fontSize: '3.5rem' }}
                >
                  Bienvenido
                </motion.h1>
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{ margin: 0, color: 'var(--text)', fontWeight: 400, fontSize: '2rem', fontFamily: 'var(--font-ibm-mono)' }}
                >
                  {user.nombre}
                </motion.h2>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  style={{ marginTop: '32px' }}
                >
                  <Loader2 className="animate-spin" size={24} style={{ color: 'var(--muted)', margin: '0 auto' }} />
                </motion.div>
              </div>
            </motion.section>
          )}

          {view === "dashboard" && user && (
            <motion.section key="dashboard" className="dashboard-layout" {...pageTransition}>
              <aside className="sidebar">
                <motion.div 
                  className="user-card" 
                  style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start', position: 'sticky', top: '24px' }}
                  initial={{ x: -150, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.1 }}
                >
                  <div style={{ 
                    width: '200px', 
                    height: '200px', 
                    borderRadius: '12px', 
                    backgroundColor: 'var(--background)', 
                    border: '1px solid var(--border)',
                    display: 'grid', 
                    placeItems: 'center', 
                    color: 'var(--bone)', 
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {user.foto ? (
                      <img 
                        src={user.foto.startsWith('http') || user.foto.startsWith('/api/') ? user.foto : `${import.meta.env.BASE_URL}${user.foto.startsWith('/') ? user.foto.substring(1) : user.foto}`} 
                        alt={`Foto de ${user.nombre}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
                        }}
                      />
                    ) : (
                      <BlueprintUserIcon />
                    )}
                  </div>
                  <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <p className="user-label">Usuario Conectado</p>
                      <h2 style={{ margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>{user.nombre}</h2>
                      {user.alias && (
                        <p style={{ margin: '4px 0 0 0', color: 'var(--accent)', fontSize: '0.95rem', fontStyle: 'italic' }}>"{user.alias}"</p>
                      )}
                      {user.bio && (
                        <p style={{ margin: '8px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>{user.bio}</p>
                      )}
                    </div>
                    <div className="user-meta" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <p>Matrícula: <br/><strong style={{fontSize: '1rem', color: 'var(--text)'}}>{user.matricula}</strong></p>
                      <p>Grupo: <br/><strong style={{fontSize: '1rem', color: 'var(--text)'}}>{user.grupo}</strong></p>
                      <p>Teléfono: <br/><strong style={{fontSize: '1rem', color: 'var(--text)'}}>{user.telefono}</strong></p>
                      <p>Rol: <br/><strong style={{fontSize: '1rem', color: 'var(--accent)'}}>{user.rol.toUpperCase()}</strong></p>
                      <p>Estado: <strong style={{ color: "var(--success)" }}>Online</strong></p>
                      {(user.github || user.instagram || user.reddit || user.facebook) && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {user.github && (
                            <a href={`https://github.com/${user.github}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)' }}>
                              <GithubIcon />
                            </a>
                          )}
                          {user.instagram && (
                            <a href={`https://instagram.com/${user.instagram}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)' }}>
                              <InstagramIcon />
                            </a>
                          )}
                          {user.reddit && (
                            <a href={user.reddit.startsWith('http') ? user.reddit : `https://reddit.com/user/${user.reddit}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)' }}>
                              <RedditIcon />
                            </a>
                          )}
                          {user.facebook && (
                            <a href={user.facebook.startsWith('http') ? user.facebook : `https://facebook.com/${user.facebook}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)' }}>
                              <FacebookIcon />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    className="logout-btn-small" 
                    style={{ width: '100%', marginTop: 'auto' }}
                    onClick={() => {
                      setProfileForm({
                        alias: user.alias || '',
                        bio: user.bio || '',
                        foto: user.foto || '',
                        github: user.github || '',
                        instagram: user.instagram || '',
                        reddit: user.reddit || '',
                        facebook: user.facebook || ''
                      });
                      setMainContext("edit_profile");
                    }}
                  >
                    Personalizar Perfil
                  </button>
                </motion.div>
              </aside>

              <main className="main-content" style={{ position: 'relative' }}>
                <AnimatePresence mode="wait">
                  {mainContext === "modules" && (
                    <motion.div key="modules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <motion.div 
                        className="brand"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div>
                          <h1>Panel Principal</h1>
                        </div>
                      </motion.div>

                      <motion.p 
                        className="user-welcome"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        Módulos del Sistema (Vista General de Administrador):
                      </motion.p>
                      
                      <motion.div className="action-grid" layout style={{ alignItems: 'start' }}>
                        {user.rol === "operador" ? (
                          operadorActions.map((action, idx) => {
                            return (
                              <motion.div 
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + (idx * 0.1) }}
                                key={idx} 
                                className="action-card"
                                onClick={() => {
                                  if (action.view === "controles") {
                                    setView("robot_selection");
                                  } else {
                                    setView(action.view);
                                  }
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--accent)', color: 'black' }}
                              >
                                <motion.span layout style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <ConsoleIcon /> {action.title}
                                </motion.span>
                              </motion.div>
                            );
                          })
                        ) : (
                        adminActions.map((action, idx) => {
                          const isActive = activeModule?.view === action.view;
                          return (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + (idx * 0.1) }}
                              key={idx} 
                              className={isActive ? "" : "action-card"}
                              onClick={() => {
                                if (action.view === "controles") {
                                  setView("robot_selection");
                                } else if (!isActive) {
                                  setActiveModule(action);
                                }
                              }}
                              style={isActive ? {
                                background: 'var(--surface)', 
                                border: '1px solid var(--accent)',
                                borderRadius: '8px',
                                padding: '32px',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: '360px',
                                gridColumn: '1 / -1',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                cursor: 'default'
                              } : { 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                ...(action.view === "controles" ? { background: 'var(--accent)', color: 'black' } : {})
                              }}
                            >
                              {isActive ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                  <div className="panel-header" style={{ marginBottom: '24px' }}>
                                    <span className="panel-label">MÓDULO ACTIVO</span>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--accent)' }}>
                                      {action.title}
                                    </h2>
                                  </div>
                                  <div style={{ flex: 1, overflowY: 'auto' }}>
                                    <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-ibm-mono)' }}>
                                      &gt; Conectando al módulo seguro: {action.view}...<br/><br/>
                                      Panel interactivo de {action.title}.
                                    </p>
                                  </div>
                                  <button 
                                    className="back-link" 
                                    style={{ marginTop: '24px', alignSelf: 'flex-start' }} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveModule(null);
                                    }}
                                  >
                                    ← Minimizar Panel
                                  </button>
                                </motion.div>
                              ) : (
                                <motion.span layout style={action.view === "controles" ? { fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' } : { fontSize: '1.1rem' }}>
                                  {action.view === "controles" ? <><ConsoleIcon /> {action.title}</> : action.title}
                                </motion.span>
                              )}
                            </motion.div>
                          );
                        })
                        )}
                      </motion.div>
                    </motion.div>
                  )}

                  {mainContext === "settings" && (
                    <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <div className="panel-header" style={{ marginBottom: '32px' }}>
                        <span className="panel-label">CONFIGURACIÓN GENERAL</span>
                        <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--accent)' }}>Ajustes del Sistema</h2>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--surface-strong)', cursor: 'pointer' }}>
                          <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.9rem', color: 'var(--text)' }}>TEXTO GRANDE</span>
                          <input type="checkbox" style={{width: 'auto', cursor: 'pointer'}} checked={largeText} onChange={(e) => setLargeText(e.target.checked)} />
                        </label>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--surface-strong)', cursor: 'pointer' }}>
                          <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.9rem', color: 'var(--text)' }}>REDUCIR ANIMACIONES</span>
                          <input type="checkbox" style={{width: 'auto', cursor: 'pointer'}} checked={reduceAnimations} onChange={(e) => setReduceAnimations(e.target.checked)} />
                        </label>
                      </div>

                      <button className="back-link" style={{ marginTop: '32px' }} onClick={() => setMainContext("modules")}>← Volver a los Módulos</button>
                    </motion.div>
                  )}

                  {mainContext === "edit_profile" && (
                    <motion.div key="edit_profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <div className="panel-header" style={{ marginBottom: '32px' }}>
                        <span className="panel-label">IDENTIDAD</span>
                        <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--accent)' }}>Personaliza tu Perfil</h2>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '800px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="input-group">
                            <label>Alias / Apodo</label>
                            <input type="text" placeholder="Ej. CyberNinja" value={profileForm.alias} onChange={e => setProfileForm({...profileForm, alias: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>Breve Bio (Gustos / Personalidad)</label>
                            <input type="text" placeholder="Me gusta la robótica y el café..." value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>Foto de Perfil (Opcional - Max 2MB)</label>
                            <input 
                              type="file" 
                              accept="image/png, image/jpeg, image/webp" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                if (file.size > 2 * 1024 * 1024) {
                                  alert("La imagen no puede pesar más de 2MB");
                                  e.target.value = '';
                                  return;
                                }

                                const formData = new FormData();
                                formData.append('avatar', file);
                                
                                try {
                                  const res = await fetch('/api/upload_avatar.php', {
                                    method: 'POST',
                                    body: formData
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    setProfileForm({...profileForm, foto: data.url});
                                    alert("Foto subida temporalmente. Dale a 'Guardar Cambios' para confirmar.");
                                  } else {
                                    alert(data.message || "Error al subir foto");
                                  }
                                } catch (err) {
                                  alert("Error de conexión al subir la foto");
                                }
                              }}
                              style={{
                                padding: '8px',
                                background: 'var(--surface-strong)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                color: 'var(--text)',
                                width: '100%',
                                fontFamily: 'var(--font-ibm-mono)'
                              }}
                            />
                            {profileForm.foto && profileForm.foto.includes('/api/uploads/') && (
                              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={14} /> Foto subida y lista
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="input-group">
                            <label>GitHub (URL)</label>
                            <input type="text" placeholder="https://github.com/..." value={profileForm.github} onChange={e => setProfileForm({...profileForm, github: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>Instagram / Twitter (URL)</label>
                            <input type="text" placeholder="https://instagram.com/..." value={profileForm.instagram} onChange={e => setProfileForm({...profileForm, instagram: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>Reddit (URL o Usuario)</label>
                            <input type="text" placeholder="Usuario o URL" value={profileForm.reddit} onChange={e => setProfileForm({...profileForm, reddit: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>Facebook (URL)</label>
                            <input type="text" placeholder="https://facebook.com/..." value={profileForm.facebook} onChange={e => setProfileForm({...profileForm, facebook: e.target.value})} />
                          </div>
                          <button className="primary-btn" style={{ marginTop: 'auto' }} onClick={async () => {
                            try {
                              const res = await fetch('/api/update_profile.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(profileForm)
                              });
                              if (res.ok) {
                                setUser({ ...user, ...profileForm });
                                alert("Perfil actualizado con éxito.");
                                setMainContext("modules");
                              } else {
                                alert("Error al guardar perfil.");
                              }
                            } catch (e) {
                              alert("Error de conexión.");
                            }
                          }}>
                            Guardar Cambios
                          </button>
                        </div>
                      </div>

                      <button className="back-link" style={{ marginTop: '32px' }} onClick={() => setMainContext("modules")}>← Cancelar y Volver</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </motion.section>
          )}
          {view === "robot_selection" && user && (user.rol === "operador" || user.rol === "admin") && (
            <motion.section key="robot_selection" className="full-container" style={{ maxWidth: '100%', padding: '0 40px' }} {...pageTransition}>
                <RobotSelection 
                  robots={robots}
                  onBack={() => setView("dashboard")}
                  onSelectRobot={(robot) => {
                    setLivekitToken(robot); // We repurpose this state to hold the entire robot object
                    setView("controles");
                  }}
                  onAddRobot={(newRobot) => {
                    setRobots(prev => [...prev, newRobot]);
                  }}
                  onUpdateRobot={(updatedRobot) => {
                    setRobots(prev => prev.map(r => r.id === updatedRobot.id ? updatedRobot : r));
                  }}
                  controlMappings={user.control_mappings}
                  onUpdateMappings={async (newMappings) => {
                    try {
                      const res = await fetch('/api/update_mappings.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ control_mappings: newMappings })
                      });
                      if (res.ok) {
                        setUser({ ...user, control_mappings: newMappings });
                        alert("Controles mapeados con éxito.");
                      } else {
                        alert("Error al guardar controles.");
                      }
                    } catch (e) {
                      alert("Error de conexión.");
                    }
                  }}
                />
            </motion.section>
          )}

          {view === "controles" && livekitToken && (
            <motion.section key="controller" className="full-container controller-view" {...pageTransition}>
              <Suspense fallback={
                <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Loader2 className="animate-spin" size={64} style={{ marginBottom: '24px' }} />
                  <h2 style={{ fontFamily: 'var(--font-ibm-mono)', margin: 0 }}>INICIALIZANDO CONSOLA...</h2>
                </div>
              }>
                <ControllerApp 
                  onBack={() => setView("dashboard")} 
                  robot={livekitToken}
                  controlMappings={user.control_mappings}
                />
              </Suspense>
            </motion.section>
          )}

          {view === "admin_users" && (
            <motion.section key="admin_users" className="dashboard-card" {...pageTransition}>
              <div className="panel-header">
                <span className="panel-label">ADMINISTRADOR</span>
                <h2 style={{margin: '0', fontSize: '1.25rem'}}>Gestión de Usuarios</h2>
              </div>
              <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Nombre</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Rol</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px dashed var(--border)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--text)' }}>Alice Vega</td>
                      <td style={{ padding: '12px 8px', color: 'var(--muted)' }}>Operador</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}><button className="logout-btn-small" style={{borderColor: 'var(--error)', color: 'var(--error)'}} onClick={() => console.log('Revocando usuario...')}>Revocar</button></td>
                    </tr>
                    <tr style={{ borderBottom: '1px dashed var(--border)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--text)' }}>Bob Torres</td>
                      <td style={{ padding: '12px 8px', color: 'var(--muted)' }}>Hardware</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}><button className="logout-btn-small" style={{borderColor: 'var(--error)', color: 'var(--error)'}} onClick={() => console.log('Revocando usuario...')}>Revocar</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button className="back-link" onClick={() => setView("dashboard")}>← Volver</button>
            </motion.section>
          )}

          {view === "admin_logs" && (
            <motion.section key="admin_logs" className="dashboard-card" {...pageTransition}>
              <div className="panel-header">
                <span className="panel-label">ADMINISTRADOR</span>
                <h2 style={{margin: '0', fontSize: '1.25rem'}}>Logs Generales</h2>
              </div>
              <div style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '16px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.75rem', height: '200px', overflowY: 'auto', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ color: 'var(--success)', marginBottom: '8px' }}>[16:01:23] [OK] Sistema iniciado correctamente.</div>
                <div style={{ color: 'var(--muted)', marginBottom: '8px' }}>[16:05:11] [INFO] Usuario admin logueado (IP: 10.0.0.45).</div>
                <div style={{ color: 'var(--error)', marginBottom: '8px' }}>[16:08:44] [WARN] Intento de acceso fallido (IP: 192.168.1.5).</div>
                <div style={{ color: 'var(--muted)', marginBottom: '8px' }}>[16:15:00] [INFO] Sincronización DB completada.</div>
                <div style={{ color: 'var(--accent)', marginBottom: '8px' }}>[16:28:10] [SYS] Modo diagnóstico activo.</div>
              </div>
              <button className="back-link" onClick={() => setView("dashboard")}>← Volver</button>
            </motion.section>
          )}

          {view === "admin_config" && (
            <motion.section key="admin_config" className="full-container" style={{ maxWidth: '1600px', padding: '0 40px' }} {...pageTransition}>
              <div className="panel-header">
                <span className="panel-label">ADMINISTRADOR</span>
                <h2 style={{margin: '0', fontSize: '1.25rem'}}>Configuración y Unidades</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', textAlign: 'left' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', color: 'var(--accent)' }}>Ajustes del Sistema</h3>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--background)' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>MODO MANTENIMIENTO</span>
                  <input type="checkbox" style={{width: 'auto'}} />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--background)' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>BLOQUEO GLOBAL RED</span>
                  <input type="checkbox" style={{width: 'auto'}} />
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', textAlign: 'left', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: 'var(--accent)' }}>Administración de Robots (Base de Datos)</h3>
                    <button onClick={() => setEditingRobot({ isNew: true, id: `rassor-${Date.now().toString().slice(-4)}`, name: '', room: '', status: 'online', modelUrl: '' })} style={{ background: 'var(--accent)', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-ibm-mono)' }}>+ Registrar Nueva Unidad</button>
                </div>

                <div style={{ overflowX: 'auto', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                                <th style={{ padding: '16px' }}>ESTADO</th>
                                <th style={{ padding: '16px' }}>UNIDAD (NOMBRE)</th>
                                <th style={{ padding: '16px' }}>ID INTERNO</th>
                                <th style={{ padding: '16px' }}>LIVEKIT ROOM</th>
                                <th style={{ padding: '16px' }}>MODELO 3D (.glb)</th>
                                <th style={{ padding: '16px', textAlign: 'right' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {robots.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.status === 'online' ? '#00ffaa' : '#ff4444', boxShadow: `0 0 8px ${r.status === 'online' ? '#00ffaa' : '#ff4444'}` }} />
                                            <span style={{ color: r.status === 'online' ? '#00ffaa' : '#ff4444' }}>{r.status.toUpperCase()}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: 500, fontFamily: 'var(--font-ibm-mono)', fontSize: '0.95rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{r.name}</td>
                                    <td style={{ padding: '16px', color: 'var(--muted)' }}>{r.id}</td>
                                    <td style={{ padding: '16px', color: 'var(--accent)' }}>{r.room}</td>
                                    <td style={{ padding: '16px', color: 'var(--muted)' }}>{r.modelUrl || 'Modelo por defecto'}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button onClick={() => setEditingRobot(r)} style={{ background: 'transparent', color: 'white', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>Editar</button>
                                        <button onClick={() => setRobots(robots.filter(robot => robot.id !== r.id))} style={{ background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                            {robots.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>No hay unidades registradas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* MODAL DE EDICIÓN (Overlay) */}
                {editingRobot && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)' }}>
                        <div style={{ background: 'var(--background)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '32px', width: '100%', maxWidth: '600px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '24px', fontFamily: 'var(--font-ibm-mono)', fontSize: '1.1rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                                {editingRobot.isNew ? 'Registrar Nueva Unidad' : 'Editar Unidad'}
                            </h3>
                            <form onSubmit={handleSaveRobot} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        ID Interno (Identificador único)
                                        <input name="id" defaultValue={editingRobot.id} readOnly={!editingRobot.isNew} required style={{ padding: '12px', background: 'var(--surface)', color: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        Nombre Público (Display Name)
                                        <input name="name" defaultValue={editingRobot.name} required style={{ padding: '12px', background: 'var(--surface)', color: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        LiveKit Room (Para la conexión)
                                        <input name="room" defaultValue={editingRobot.room} required style={{ padding: '12px', background: 'var(--surface)', color: '#fff', border: '1px solid var(--accent)', borderRadius: '4px' }} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        Estado (Simulación Local)
                                        <select name="status" defaultValue={editingRobot.status} style={{ padding: '12px', background: 'var(--surface)', color: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                            <option value="online">Online (Verde)</option>
                                            <option value="offline">Offline (Rojo)</option>
                                        </select>
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', gridColumn: 'span 2' }}>
                                        Ruta del Modelo 3D (.glb) - Opcional
                                        <input name="modelUrl" defaultValue={editingRobot.modelUrl} placeholder="/models/mi-robot.glb" style={{ padding: '12px', background: 'var(--surface)', color: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }} />
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                    <button type="button" onClick={() => setEditingRobot(null)} style={{ padding: '12px 24px', background: 'transparent', color: '#fff', border: '1px solid var(--muted)', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)' }}>Cancelar</button>
                                    <button type="submit" style={{ padding: '12px 24px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-ibm-mono)' }}>{editingRobot.isNew ? 'Registrar' : 'Guardar Cambios'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
              </div>
              <button className="back-link" onClick={() => setView("dashboard")}>← Volver al Menú Principal</button>
            </motion.section>
          )}

          {view === "placeholder" && (
            <motion.section key="placeholder" className="dashboard-card" {...pageTransition}>
              <h1>En Construcción</h1>
              <p>Este componente React está en construcción.</p>
              <button className="back-link" onClick={() => setView("dashboard")}>Volver</button>
            </motion.section>
          )}
          {view === "settings_menu" && (
            <motion.section key="settings_menu" className="dashboard-card" {...pageTransition}>
              <div className="panel-header">
                <span className="panel-label">CONFIGURACIÓN</span>
                <h2 style={{margin: '0', fontSize: '1.25rem'}}>Menú de Ajustes</h2>
              </div>
              <p className="user-welcome">Selecciona un apartado a configurar:</p>
              <div className="action-grid" style={{ marginBottom: '24px' }}>
                <button className="action-card" onClick={() => setView("accessibility")}>
                  Accesibilidad
                </button>
                {user && (
                  <button className="action-card" onClick={() => setView("profile_settings")}>
                    Perfil de Usuario
                  </button>
                )}
              </div>
              <button className="back-link" onClick={() => setView(user ? "dashboard" : "login")}>← Volver al inicio</button>
            </motion.section>
          )}

          {view === "accessibility" && (
            <motion.section key="accessibility" className="dashboard-card" {...pageTransition}>
              <div className="panel-header">
                <span className="panel-label">AJUSTES</span>
                <h2 style={{margin: '0', fontSize: '1.25rem'}}>Accesibilidad</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', textAlign: 'left' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>TEXTO GRANDE</span>
                  <input 
                    type="checkbox" 
                    style={{width: 'auto', cursor: 'pointer'}} 
                    checked={largeText}
                    onChange={(e) => setLargeText(e.target.checked)}
                  />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>REDUCIR ANIMACIONES</span>
                  <input 
                    type="checkbox" 
                    style={{width: 'auto', cursor: 'pointer'}} 
                    checked={reduceAnimations}
                    onChange={(e) => setReduceAnimations(e.target.checked)}
                  />
                </label>
              </div>
              <button className="back-link" onClick={() => setView("settings_menu")}>← Atrás</button>
            </motion.section>
          )}

          {view === "profile_settings" && user && (
            <motion.section key="profile_settings" className="dashboard-card" {...pageTransition}>
              <div className="panel-header">
                <span className="panel-label">AJUSTES</span>
                <h2 style={{margin: '0', fontSize: '1.25rem'}}>Perfil de Usuario</h2>
              </div>
              <p style={{fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '24px'}}>
                Detalles menores del usuario. Opciones avanzadas bloqueadas por el administrador.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', textAlign: 'left' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--background)' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>MOSTRAR ALIAS EN TABLERO</span>
                  <input type="checkbox" checked={showAlias} onChange={(e) => setShowAlias(e.target.checked)} style={{width: 'auto', cursor: 'pointer'}} />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--background)' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>RECIBIR NOTIFICACIONES PUSH</span>
                  <input type="checkbox" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} style={{width: 'auto', cursor: 'pointer'}} />
                </label>
              </div>
              <button 
                className="primary-btn" 
                style={{ marginBottom: '16px', width: '100%', padding: '12px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/update_profile.php', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ show_alias: showAlias, push_notifications: pushNotifications })
                    });
                    if (res.ok) {
                      setUser({ ...user, show_alias: showAlias, push_notifications: pushNotifications });
                      alert("Cambios guardados con éxito.");
                    } else {
                      alert("Error al guardar cambios.");
                    }
                  } catch (e) {
                    alert("Error de conexión.");
                  }
                }}
              >
                Guardar Cambios
              </button>
              <button className="back-link" onClick={() => setView("settings_menu")}>← Atrás</button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
    </MotionConfig>
  );
}