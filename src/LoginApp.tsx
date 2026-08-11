import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Loader2, CheckCircle, ChevronDown, ChevronUp, Globe, Lock, Upload, TriangleAlert, Star, Eye, EyeOff, Languages, X } from "lucide-react";
import "./index.css";
import { ModeSelect } from "./controller/ModeSelect";
// Carga diferida: arrastra Robot3DPreview -> @react-three/fiber/drei ->
// three.js entero. Sin esto, cualquiera que solo entra a /login (incluso a
// escribir su matrícula, o sin rol de operador) ya pagaba la descarga
// completa de three.js en el bundle de LoginApp -- mismo patrón que
// ControllerApp más abajo.
const RobotSelection = lazy(() => import("./controller/RobotSelection").then((m) => ({ default: m.RobotSelection as React.ComponentType<any> })));
const PanelTransmision = lazy(() => import("./controller/PanelTransmision").then((m) => ({ default: m.PanelTransmision as React.ComponentType<any> })));
import { apiFetch } from "./lib/apiClient";
import { sanitizeHtml } from "./lib/sanitizeHtml";
import { useLanguage } from "./lib/i18n";
import { Ayuda } from "./components/Ayuda";
import { PanelRoles } from "./components/PanelRoles";

const ControllerApp = lazy(() => import("./controller/ControllerApp"));

// Mismo patrón que src/controller/RobotSelection.jsx: un objeto de estilos
// compartidos para no repetir el mismo bloque a mano en cada campo de
// formulario. Antes el estilo de "input" de este archivo estaba copiado
// literalmente 7 veces en el formulario de robots, cada uno con `color: '#fff'`
// suelto en vez de var(--text).
const S = {
  input: { padding: '12px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' },
};

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

// Actions now generated dynamically inside component

// Único lugar donde se decide si un usuario tiene un rol. Antes cada sitio lo
// resolvía por su cuenta y no todos contemplaban `rol` (singular, el campo de
// la época de PHP; se mantiene como red defensiva por si algún día vuelve a
// aparecer en una respuesta, aunque hoy el backend siempre manda `roles`): el mismo
// usuario veía unos módulos del menú y no otros según qué chequeo lo evaluara.
function getRoles(user: any): string[] {
  if (Array.isArray(user?.roles)) return user.roles;
  return user?.rol ? [user.rol] : [];
}

// Las áreas del grupo, cerradas a propósito: son lo que agrupa la página
// pública de miembros, y con texto libre la misma área acaba escrita de tres
// formas distintas —en la base ya convivían "Software & Mechanical" y
// "Software  & Hardware", con dos espacios— y la agrupación se rompe.
const AREAS = ['Hardware', 'Software', 'Control', 'Mecánica', 'Diseño', 'Difusión'];

// Devuelve true si el usuario tiene AL MENOS uno de los roles pedidos.
function hasRole(user: any, ...roles: string[]): boolean {
  const owned = getRoles(user);
  return roles.some((role) => owned.includes(role));
}

/**
 * Si esta persona puede hacer algo.
 *
 * Los permisos llegan ya resueltos desde /api/me: el panel no vuelve a
 * calcular qué implica cada rol, porque hacerlo por su cuenta es la forma
 * segura de acabar discrepando del servidor —enseñando un botón que luego
 * devuelve 403, o escondiendo uno que sí funcionaba—.
 *
 * Esto decide qué se VE. Lo que se PUEDE lo decide el servidor, que vuelve a
 * comprobarlo en cada petición. Ocultar un botón es cortesía, no seguridad.
 */
function puede(user: any, ...permisos: string[]): boolean {
  const suyos: string[] = Array.isArray(user?.permisos) ? user.permisos : [];
  // Mientras /api/me no haya respondido todavía, un admin sigue viéndolo
  // todo: sin esto, el panel parpadea vacío en cada recarga.
  if (suyos.length === 0 && hasRole(user, 'admin')) return true;
  return permisos.some((p) => suyos.includes(p));
}


const AdminContent = ({ onBack, user }: { onBack: () => void, user: any }) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'list'|'create'|'edit'>('list');
  const [postsList, setPostsList] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [type, setType] = useState('simple');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [pages, setPages] = useState([{ content: '', image: '' }]);
  const [countdownDate, setCountdownDate] = useState('');
  const [category, setCategory] = useState('landing');
  const [modelUrl, setModelUrl] = useState('');
  // Quién desarrolló esto. `personas` es el catálogo para elegir; `autores`,
  // los elegidos con su papel en ESTE proyecto.
  const [personas, setPersonas] = useState<any[]>([]);
  const [autores, setAutores] = useState<{ userId: number; papel: string; lider: boolean }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEjemplos, setShowEjemplos] = useState(false);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      const sorted = data.sort((a: any, b: any) => {
        if (a.type === 'aviso' && b.type !== 'aviso') return -1;
        if (a.type !== 'aviso' && b.type === 'aviso') return 1;
        return 0;
      });
      setPostsList(sorted);
    } catch(err) { console.error(err); }
  };

  useEffect(() => {
    if (viewMode === 'list') fetchPosts();
  }, [viewMode]);

  // El catálogo de personas solo lo pide quien puede firmar: para un redactor
  // sería una petición que va a devolver 403.
  useEffect(() => {
    if (!puede(user, 'publicaciones.firmar')) return;
    apiFetch('/api/personas')
      .then((res) => (res.ok ? res.json() : []))
      .then((datos) => setPersonas(Array.isArray(datos) ? datos : []))
      .catch(() => {});
  }, [user]);

  const handleDelete = async (id: string) => {
    if(!window.confirm(t('alertas.confirmarEliminarPublicacion'))) return;
    try {
      const res = await apiFetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPosts();
      else alert(t('alertas.sinPermisos'));
    } catch(err) { alert(t('alertas.errorEliminar')); }
  };

  const toggleVisibility = async (post: any) => {
    try {
      const res = await apiFetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden: !post.isHidden })
      });
      if (res.ok) fetchPosts();
      else alert(t('alertas.sinPermisos'));
    } catch(err) { alert(t('alertas.errorActualizarVisibilidad')); }
  };

  const openEdit = (post: any) => {
    setEditingId(post.id);
    if (post.type === 'simple' || post.type === 'aviso' || post.type === 'evento' || post.type === '3d_model') {
      setContent(post.content || '');
    } else {
      setPages(post.pages && post.pages.length > 0 ? post.pages : [{ content: '', image: '' }]);
    }
    setType(post.type || 'simple');
    setTitle(post.title || '');
    setImage(post.image || '');
    setCountdownDate(post.countdownDate || '');
    setModelUrl(post.modelUrl || '');
    setAutores((post.autores || []).map((a: any) => ({ userId: a.id, papel: a.papel || '', lider: Boolean(a.lider) })));
    setViewMode('edit');
  };

  const resetForm = () => {
    setEditingId(null);
    setType('simple');
    setTitle('');
    setContent('');
    setImage('');
    setCountdownDate('');
    setPages([{ content: '', image: '' }]);
    setModelUrl('');
    setAutores([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setUploadingImage(true);
    try {
      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.url) callback(data.url);
      else alert(t('alertas.errorSubirImagen'));
    } catch(err) { alert(t('alertas.errorConexionImagen')); }
    setUploadingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const postData = {
      title, type, image, category, modelUrl,
      content: (type === 'simple' || type === 'aviso' || type === 'evento' || type === '3d_model') ? content : 'Contenido Multi-página',
      pages: type === 'magazine' ? pages : [],
      countdownDate: (type === 'aviso' || type === 'evento') ? countdownDate : undefined,
      // Solo se manda si esta cuenta puede firmar. El servidor lo vuelve a
      // comprobar; esto evita mandar un campo que va a ignorar.
      autores: puede(user, 'publicaciones.firmar') ? autores.filter(a => a.userId) : undefined,
    };

    try {
      const url = viewMode === 'edit' ? `/api/posts/${editingId}` : '/api/posts';
      const method = viewMode === 'edit' ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      if (res.ok) {
        alert(viewMode === 'edit' ? t('alertas.publicacionActualizada') : t('alertas.publicacionCreada'));
        setViewMode('list');
      } else {
        alert(t('alertas.sinPermisosGuardar'));
      }
    } catch(err) { alert(t('alertas.errorConectarServidor')); }
    setIsSubmitting(false);
  };

  if (viewMode === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '60vh' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <button className="back-link" onClick={onBack}>{t('adminPublicaciones.volverMenu')}</button>
          <div>
            <h2 className="titulo-panel">{t('adminPublicaciones.titulo')}</h2>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Tarjeta de Crear Nueva */}
          <div 
            onClick={() => { resetForm(); setViewMode('create'); }}
            style={{ 
              border: '2px dashed var(--border)', borderRadius: '8px', padding: '24px', display: 'flex', 
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--surface)',
              minHeight: '280px', transition: 'all 0.3s ease', color: 'var(--muted)', textAlign: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            <div style={{ fontSize: '3rem', fontWeight: '100', marginBottom: '16px', lineHeight: 1 }}>+</div>
            <div>
              <div style={{ fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('adminPublicaciones.crearNuevaTitulo')}
                <Ayuda texto={t('adminPublicaciones.crearNuevaDescripcion')} />
              </div>
            </div>
          </div>

          {/* Lista de Publicaciones */}
          {postsList.map(post => {
            const isAviso = post.type === 'aviso';
            const isEvento = post.type === 'evento';
            
            const borderColor = isAviso ? 'var(--error)' : isEvento ? 'var(--accent)' : 'var(--border)';
            const bgColor = isAviso ? 'rgba(255,68,68,0.03)' : isEvento ? 'rgba(251,202,1,0.05)' : 'var(--surface)';
            const titleColor = isAviso ? 'var(--error)' : isEvento ? 'var(--accent)' : 'var(--text)';
            const badgeBg = isAviso ? 'var(--error)' : isEvento ? 'var(--accent)' : 'rgba(5,7,15,0.8)';
            const badgeColor = (isAviso || isEvento) ? 'black' : 'var(--accent)';
            const badgeText = post.type === 'magazine' ? 'REVISTA' : isAviso ? 'AVISO' : isEvento ? 'EVENTO' : post.type === '3d_model' ? 'MODELO 3D' : 'SIMPLE';
            const BadgeIcon = isAviso ? TriangleAlert : isEvento ? Star : null;

            return (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              /* Se eleva y se acerca al pasar por encima; al pulsar se hunde,
                 que es la respuesta que espera un dedo en una tablet. Con
                 transformaciones, no con `top`: las resuelve la tarjeta
                 gráfica sin recalcular la rejilla entera. */
              whileHover={{ y: -6, boxShadow: '0 18px 36px rgba(0,0,0,0.5)' }}
              whileTap={{ scale: 0.99 }}
              style={{
                border: '1px solid var(--border)',
                borderTop: `2px solid ${borderColor}`,
                borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                background: 'var(--surface)',
                minHeight: '280px'
              }}
            >
              <div style={{ height: '140px', width: '100%', background: 'var(--surface-strong)', backgroundImage: post.image ? `url(${post.image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: '4px', background: badgeBg, padding: '4px 10px', borderRadius: '4px', border: (isAviso || isEvento) ? 'none' : '1px solid var(--accent)', color: badgeColor, fontSize: '0.7rem', fontFamily: 'var(--font-ibm-mono)', fontWeight: (isAviso || isEvento) ? 'bold' : 'normal' }}>
                  {BadgeIcon && <BadgeIcon size={12} />} {badgeText}
                </div>
              </div>
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontFamily: 'var(--font-titulo)', color: 'var(--text)', lineHeight: 1.25 }}>{post.title}</h3>
                  <div style={{ display: 'inline-block', background: 'var(--surface-strong)', color: 'var(--muted)', fontSize: '0.7rem', fontFamily: 'var(--font-ibm-mono)', padding: '2px 6px', borderRadius: '4px', marginBottom: '8px', border: '1px solid var(--border)' }}>
                    {t('adminPublicaciones.destino')}: {(post.category || 'landing').toUpperCase()}
                  </div>
                  {/* La explicación del tipo, dentro de una interrogación: se
                      consulta una vez y deja de ocupar sitio para siempre. */}
                  <Ayuda texto={post.type === 'magazine' ? t('adminPublicaciones.tipoRevista') : isAviso ? t('adminPublicaciones.tipoAviso') : isEvento ? t('adminPublicaciones.tipoEvento') : post.type === '3d_model' ? t('adminPublicaciones.tipoModelo3d') : t('adminPublicaciones.tipoSimple')} />
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                  <button onClick={() => toggleVisibility(post)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--muted)', color: 'var(--muted)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--muted)'; e.currentTarget.style.color = 'var(--surface-strong)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
                  >
                    {post.isHidden ? <Eye size={14} /> : <EyeOff size={14} />} {post.isHidden ? t('adminPublicaciones.mostrar') : t('adminPublicaciones.ocultar')}
                  </button>
                  <button onClick={() => openEdit(post)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'black'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent)'; }}
                  >
                    {t('adminPublicaciones.modificar')}
                  </button>
                  <button onClick={() => handleDelete(post.id)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--error)'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--error)'; }}
                  >
                    {t('adminPublicaciones.eliminar')}
                  </button>
                </div>
              </div>
            </motion.div>
          )})}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px', height: '100%', minHeight: '80vh' }}>
      {/* Sidebar de Configuración */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <button className="back-link" onClick={() => setViewMode('list')} style={{ marginBottom: '16px', alignSelf: 'flex-start' }}>{t('adminPublicaciones.cancelarVolver')}</button>
        <div>
          <h2 className="titulo-panel titulo-panel--acento">{viewMode === 'edit' ? t('adminPublicaciones.editar') : t('adminPublicaciones.crear')}</h2>
        </div>

        <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>{t('adminPublicaciones.tipoLabel')}</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--font-ibm-sans)' }}>
              <option value="simple">{t('adminPublicaciones.tipoSimpleOption')}</option>
              <option value="magazine">{t('adminPublicaciones.tipoMagazineOption')}</option>
              <option value="aviso">{t('adminPublicaciones.tipoAvisoOption')}</option>
              <option value="evento">{t('adminPublicaciones.tipoEventoOption')}</option>
              {puede(user, 'publicaciones.firmar') && <option value="3d_model">{t('adminPublicaciones.tipoModelo3dOption')}</option>}
            </select>
          </div>

          {puede(user, 'publicaciones.firmar') && (
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>{t('adminPublicaciones.destinoLabel')}</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--font-ibm-sans)' }}>
                <option value="landing">{t('adminPublicaciones.destinoLanding')}</option>
                <option value="explora">{t('adminPublicaciones.destinoExplora')}</option>
                <option value="descubre">{t('adminPublicaciones.destinoDescubre')}</option>
                <option value="conecta">{t('adminPublicaciones.destinoConecta')}</option>
              </select>
            </div>
          )}
        </div>

        <div className="input-group">
          <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>{t('adminPublicaciones.tituloLabel')}</label>
          <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('adminPublicaciones.tituloPlaceholder')} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
        </div>

        {(type === 'aviso' || type === 'evento') && (
          <div className="input-group">
            <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: type === 'aviso' ? 'var(--error)' : 'var(--accent)', display: 'block', marginBottom: '8px' }}>{t('adminPublicaciones.fechaExpiracion')}</label>
            <input type="datetime-local" value={countdownDate} onChange={(e) => setCountdownDate(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: `1px solid ${type === 'aviso' ? 'var(--error)' : 'var(--accent)'}`, borderRadius: '4px' }} />
          </div>
        )}

        <div className="input-group">
          <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>{t('adminPublicaciones.portada')}</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setImage)} style={{ display: 'none' }} id="upload-cover" />
            <label htmlFor="upload-cover" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: 'var(--surface-strong)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>
              {uploadingImage ? t('adminPublicaciones.subiendo') : <><Upload size={14} /> {t('adminPublicaciones.subirLocal')}</>}
            </label>
          </div>
          <input type="text" value={image} onChange={(e) => setImage(e.target.value)} placeholder={t('adminPublicaciones.urlPlaceholder')} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
        </div>

        {/* Quién desarrolló esto. Va aquí, junto al título y la portada, y no
            en una pantalla aparte: se firma al publicar, que es cuando se
            sabe. Lo que se escriba aparece en la publicación con enlace al
            perfil de cada persona, y en su perfil como parte de su
            historial. */}
        {puede(user, 'publicaciones.firmar') && (
          <div className="autores">
            <label className="autores__titulo">
              {t('adminPublicaciones.desarrolladoPor')}
              <Ayuda texto={t('adminPublicaciones.desarrolladoPorAyuda')} />
            </label>

            {autores.map((a, i) => (
              <div key={i} className="autores__fila">
                <select
                  value={a.userId || ''}
                  onChange={(e) => {
                    const copia = [...autores];
                    copia[i] = { ...copia[i], userId: Number(e.target.value) };
                    setAutores(copia);
                  }}
                >
                  <option value="">{t('adminPublicaciones.elegirPersona')}</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <input
                  type="text"
                  maxLength={80}
                  placeholder={t('adminPublicaciones.papelPlaceholder')}
                  value={a.papel}
                  onChange={(e) => {
                    const copia = [...autores];
                    copia[i] = { ...copia[i], papel: e.target.value };
                    setAutores(copia);
                  }}
                />
                {/* Marcar líder aquí, y no en su perfil, es lo que hace que
                    la medalla sea un hecho registrado y no una opinión: se
                    decide en el mismo sitio donde se firma el trabajo. */}
                <label className="autores__lider" title={t('adminPublicaciones.lideroAyuda')}>
                  <input
                    type="checkbox"
                    checked={a.lider}
                    onChange={(e) => {
                      const copia = [...autores];
                      copia[i] = { ...copia[i], lider: e.target.checked };
                      setAutores(copia);
                    }}
                  />
                  {t('adminPublicaciones.lidero')}
                </label>
                <button
                  type="button"
                  className="autores__quitar"
                  aria-label={t('adminPublicaciones.quitarPersona')}
                  onClick={() => setAutores(autores.filter((_, j) => j !== i))}
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="autores__agregar"
              onClick={() => setAutores([...autores, { userId: 0, papel: '', lider: false }])}
            >
              + {t('adminPublicaciones.agregarPersona')}
            </button>
          </div>
        )}

        <button onClick={handleSubmit} disabled={isSubmitting} className="action-card" style={{ background: 'var(--accent)', color: 'black', padding: '16px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: 'auto', fontSize: '1rem' }}>
          {isSubmitting ? t('adminPublicaciones.guardando') : (viewMode === 'edit' ? t('adminPublicaciones.guardarCambios') : t('adminPublicaciones.publicarAhora'))}
        </button>
      </div>

      {/* Editor Principal */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '32px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
        <div>
          <h2 className="titulo-panel titulo-panel--acento">{t('adminPublicaciones.contenidoHtml')}</h2>
        </div>

        {/* La linea de que ya viene estilado se queda siempre visible (es
            corta y util de un vistazo); el ejemplo completo, que ocupa
            bastante espacio vertical, queda detras de un boton para no
            saturar el editor por defecto. La revelacion usa AnimatePresence
            + motion.div con la prop `layout` -- el mismo patron que ya usa
            este archivo en otros paneles que cambian de alto (ver el
            action-grid de mainContext, mas arriba) -- en vez de un
            mostrar/ocultar instantaneo sin transicion. */}
        <div style={{ background: 'var(--background)', border: '1px dashed var(--border)', borderRadius: '4px', padding: '16px 20px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.7, overflow: 'hidden' }}>
          <motion.div layout="position">
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--accent)' }}>{t('adminPublicaciones.guiaRapida')}</strong> <code style={{ color: 'var(--text)' }}>{'<h1> <h2> <h3> <p> <ul> <a> <blockquote> <img> <code>'}</code> {t('adminPublicaciones.yaTienenEstilo')} <code style={{ color: 'var(--text)' }}>{'style=""'}</code>.{' '}
              <button
                type="button"
                onClick={() => setShowEjemplos(v => !v)}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '2px', verticalAlign: 'middle' }}
              >
                {showEjemplos ? t('adminPublicaciones.ocultarEjemplo') : t('adminPublicaciones.verEjemplo')}
                {showEjemplos ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </p>
          </motion.div>
          <AnimatePresence>
            {showEjemplos && (
              <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <pre style={{ background: 'var(--surface-strong)', color: 'var(--text)', padding: '10px 14px', borderRadius: '4px', overflowX: 'auto', margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>
{`<h1>Prueba de estilo</h1>
<p>Este es un párrafo normal, sin ningún <code>style=""</code> a mano. Debería verse integrado con el resto del sitio: mismo color de texto, mismo interlineado.</p>

<h2>Un subtítulo</h2>
<p>Aquí un link de prueba: <a href="https://rur.unipolidgo.edu.mx">visita la página principal</a>. Debería salir en ámbar y subrayarse solo al pasar el mouse.</p>

<ul>
  <li>Primer punto de una lista</li>
  <li>Segundo punto, con las viñetas en ámbar</li>
  <li>Tercer punto</li>
</ul>

<blockquote>Esto es una cita destacada, con borde a la izquierda y texto un poco más apagado.</blockquote>

<div style="background: var(--accent-muted); border-left: 3px solid var(--accent); padding: 16px 20px; border-radius: 4px;">
  <strong>Nota destacada:</strong> esta caja sí lleva style="" a mano — es una de las dos recetas de la guía rápida del editor.
</div>`}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {type === '3d_model' && (
          <div className="input-group">
            <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>{t('adminPublicaciones.rutaModelo3d')}</label>
            <input type="text" value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} placeholder="Ej. /models/BMO.glb" style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
          </div>
        )}

        {(type === 'simple' || type === 'aviso' || type === 'evento' || type === '3d_model') ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', marginBottom: '16px' }}>
               <button type="button" onClick={() => setShowPreview(false)} style={{ flex: 1, padding: '12px', background: !showPreview ? 'var(--surface-strong)' : 'transparent', color: !showPreview ? 'white' : 'var(--muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-ibm-mono)', cursor: 'pointer', borderRadius: '4px 0 0 4px', fontWeight: 'bold' }}>{t('adminPublicaciones.codigoHtml')}</button>
               <button type="button" onClick={() => setShowPreview(true)} style={{ flex: 1, padding: '12px', background: showPreview ? 'var(--surface-strong)' : 'transparent', color: showPreview ? 'var(--accent)' : 'var(--muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-ibm-mono)', cursor: 'pointer', borderRadius: '0 4px 4px 0', borderLeft: 'none', fontWeight: 'bold' }}>{t('adminPublicaciones.vistaPrevia')}</button>
            </div>

            {!showPreview ? (
              <textarea required value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('adminPublicaciones.htmlPlaceholder')} style={{ flex: 1, padding: '20px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', width: '100%', minHeight: '400px', resize: 'vertical', fontFamily: 'var(--font-ibm-mono)' }}></textarea>
            ) : (
              <div style={{ flex: 1, padding: (type === 'evento' || type === 'aviso') ? '0px' : '40px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--accent)', borderRadius: '4px', width: '100%', minHeight: '400px', overflowY: 'auto' }}>
                <div className="contenido-publicacion" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {pages.map((page, idx) => (
              <div key={idx} style={{ background: 'var(--background)', border: '1px dashed var(--accent)', padding: '24px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '1.1rem' }}>{t('adminPublicaciones.pagina')} {idx + 1}</strong>
                  {pages.length > 1 && (
                    <button type="button" onClick={() => setPages(pages.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>{t('adminPublicaciones.eliminarPagina')}</button>
                  )}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>{t('adminPublicaciones.imagenPagina')}</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => {
                      const newPages = [...pages];
                      newPages[idx] = { ...newPages[idx], image: url };
                      setPages(newPages);
                    })} style={{ display: 'none' }} id={`upload-page-${idx}`} />
                    <label htmlFor={`upload-page-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px', background: 'var(--surface-strong)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      <Upload size={14} /> {t('adminPublicaciones.subirLocal')}
                    </label>
                    <input type="text" value={page.image || ''} onChange={(e) => {
                      const newPages = [...pages];
                      newPages[idx] = { ...newPages[idx], image: e.target.value };
                      setPages(newPages);
                    }} placeholder={t('adminPublicaciones.urlPlaceholder')} style={{ flex: 1, padding: '12px', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
                  </div>
                </div>
                <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>{t('adminPublicaciones.estructuraHtml')}</label>
                <textarea required value={page.content} onChange={(e) => {
                  const newPages = [...pages];
                  newPages[idx] = { ...newPages[idx], content: e.target.value };
                  setPages(newPages);
                }} placeholder={`<div style="padding: 40px;">\n  <h1>Página ${idx + 1}</h1>\n</div>`} style={{ padding: '20px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', width: '100%', minHeight: '300px', resize: 'vertical', fontFamily: 'var(--font-titulo)' }}></textarea>
              </div>
            ))}
            <button type="button" onClick={() => setPages([...pages, { content: '', image: '' }])} style={{ padding: '16px', background: 'transparent', color: 'var(--accent)', border: '1px dashed var(--accent)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '1rem', width: '100%' }}>
              {t('adminPublicaciones.anadirPagina')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


export default function App() {
  const { lang, setLang, t } = useLanguage();

  // Nada de estado en el navegador, tampoco el de navegación: al recargar se
  // arranca en login y /api/me decide a dónde se va, según la sesión real.
  const [view, setView] = useState("login");
  // Elegido en ModeSelect antes de entrar a la consola ("modo_control"),
  // para que ControllerApp arranque ya configurada. 'manual' por defecto:
  // modo VR todavía no es seleccionable (sin Vive físico para probarlo).
  const [controlMode, setControlMode] = useState("manual");
  // El usuario no se cachea en el navegador: la fuente de verdad es la base y
  // se pregunta por ella en /api/me. Antes se hidrataba desde localStorage
  // para evitar el parpadeo inicial, pero eso dejaba una copia del perfil y
  // los roles en texto plano, legible por cualquier script, y sobreviviendo
  // entre sesiones aunque la cuenta hubiera cambiado.
  const [user, setUser] = useState<any>(null);
  // Mientras no sepamos si hay sesión, no se puede decidir nada: sin esto la
  // app rebotaría al login en el primer render, antes de que /api/me conteste.
  const [sessionChecked, setSessionChecked] = useState(false);

  const [logsList, setLogsList] = useState<any[]>([]);
  const [crowdsecMetrics, setCrowdsecMetrics] = useState<any>(null);

  useEffect(() => {
    if (view === 'admin_logs') {
      apiFetch('/api/logs')
        .then(r => r.json())
        .then(data => setLogsList(data))
        .catch(err => console.error(err));

      apiFetch('/api/crowdsec/metrics')
        .then(r => r.json())
        .then(data => setCrowdsecMetrics(data))
        .catch(err => console.error(err));
    }
  }, [view]);

  useEffect(() => {
    // Ya no hay token en localStorage que revisar: la sesión vive en una
    // cookie httpOnly que el navegador manda solo. Preguntamos al backend
    // si hay una sesión válida en vez de decidirlo desde el cliente.
    const checkSession = async () => {
      try {
        const res = await apiFetch('/api/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setView("dashboard");
        } else {
          setView("login");
        }
      } catch(e) {
        console.error(e);
        setView("login");
      } finally {
        setSessionChecked(true);
      }
    };
    checkSession();
  }, []);

  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mainContext, setMainContext] = useState("modules");
  const [activeModule, setActiveModule] = useState<any>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const loadingActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Solo después de haber preguntado a /api/me. Antes el estado inicial venía
    // de localStorage y este guardia era inofensivo; ahora `user` arranca en
    // null siempre, así que sin la condición expulsaría al login a todo el
    // mundo en el primer render.
    if (sessionChecked && !user && view !== "login") {
      setView("login");
    }
  }, [sessionChecked, user, view]);

  // Solo en memoria. Es una credencial de acceso a la sala de video: guardarla
  // en sessionStorage la dejaba en texto plano al alcance de cualquier script,
  // el mismo error del que ya se migró al pasar el JWT a una cookie httpOnly.
  // Al recargar se vuelve a pedir al backend, que es barato y siempre correcto.
  const [livekitToken, setLivekitToken] = useState<any>("");
  // Pestaña del panel de personal: las personas y los roles se administran
  // en el mismo sitio porque es donde los roles se asignan.
  const [pestanaPersonal, setPestanaPersonal] = useState<'personas'|'roles'>('personas');
  // Las medallas especiales de quien se está editando: { clave: motivo }. Se
  // arranca con lo que ya tenga concedido, para poder corregir el motivo sin
  // volver a escribirlo entero.
  const [motivosMedallas, setMotivosMedallas] = useState<Record<string,string>>({});
  // Los roles ya no son una lista fija en el código: salen de la tabla, con
  // su color, para que un rol nuevo aparezca aquí sin desplegar nada.
  const [rolesDisponibles, setRolesDisponibles] = useState<any[]>([]);
  const [catalogoPermisos, setCatalogoPermisos] = useState<Record<string,string>>({});
  // Las medallas que se otorgan a mano, tal y como las define el servidor.
  // Escribirlas aquí también sería tener dos listas que un día dirían cosas
  // distintas, y solo una de las dos sería la que manda.
  const [medallasEspeciales, setMedallasEspeciales] = useState<Record<string, {nombre: string; descripcion: string}>>({});

  const [profileForm, setProfileForm] = useState({
    alias: '', bio: '', foto: '',
    github: '', linkedin: '', instagram: '', reddit: '', facebook: '',
    // Perfil público: lo que se ve en /miembros. Apagado hasta que su dueño
    // lo encienda — tener cuenta no publica a nadie.
    perfil_publico: false, rol_publico: '', area: '', generacion: '',
  });
  
  const [showAlias, setShowAlias] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      // El default sigue al del schema (show_alias BOOLEAN DEFAULT false); con
      // `?? true` un usuario sin el campo veía el switch encendido y al guardar
      // activaba algo que nunca pidió.
      setShowAlias(user.show_alias ?? false);
      setPushNotifications(user.push_notifications ?? false);
      setLargeText(user.large_text ?? false);
      setReduceAnimations(user.reduce_animations ?? false);
    }
  }, [user]);

  // Robots State para LiveKit
  const [robots, setRobots] = useState<any[]>([]);
  // Un fallo aquí dejaba la pantalla de selección completamente vacía y sin
  // explicación: la lista se quedaba a cero y no se avisaba por ningún lado, así
  // que parecía que la pantalla no cargaba en vez de que la petición había
  // fallado. Ahora el motivo llega hasta la interfaz.
  const [errorRobots, setErrorRobots] = useState<string | null>(null);

  const fetchRobots = async () => {
    try {
      const res = await apiFetch('/api/robots');
      if (res.ok) {
        setRobots(await res.json());
        setErrorRobots(null);
        return;
      }
      const detalle = await res.json().catch(() => null);
      setErrorRobots(detalle?.message ?? `El servidor respondió ${res.status} al pedir las unidades.`);
    } catch (e) {
      console.error(e);
      setErrorRobots('No se pudo contactar al servidor para pedir las unidades.');
    }
  };

  useEffect(() => {
    if (user) {
      fetchRobots();
    }
  }, [user]);
  const [editingRobot, setEditingRobot] = useState<any>(null);
  const [uploadingRobotModel, setUploadingRobotModel] = useState(false);
  const robotModelInputRef = useRef<HTMLInputElement>(null);

  // El commit original ponía este handler dentro de AdminContent, un
  // componente distinto que no comparte closure con App -- robotModelInputRef
  // y editingRobot viven aquí. Referenciarlo desde el JSX del formulario de
  // robots (dentro de App) habría sido un ReferenceError en tiempo de
  // ejecución la primera vez que alguien le diera clic al botón, algo que
  // tsc no detecta porque este archivo no corre con chequeo de tipos en el
  // build (vite build no valida tipos por defecto).
  const handleRobotModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploadingRobotModel(true);
    try {
      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.url && robotModelInputRef.current) {
        robotModelInputRef.current.value = data.url;
      } else if (!data.url) {
        alert(t('alertas.errorSubirModelo'));
      }
    } catch(err) { alert(t('alertas.errorConexionModelo')); }
    setUploadingRobotModel(false);
    e.target.value = '';
  };

  // Users State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  // Controlado, al revés que el resto del formulario: hace falta saber si está
  // marcado mientras se edita para avisar de que se va a publicar una ficha sin
  // rellenar.
  const [perfilPublicoEdit, setPerfilPublicoEdit] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch(e) {}
  };

  useEffect(() => {
    if (view === 'admin_users' && puede(user, 'usuarios.gestionar')) {
      fetchUsers();
    }
  }, [view, user]);

  const handleCreateUser = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rolesArr = formData.getAll('roles') as string[];
    // Antes, no marcar ninguna casilla asignaba 'operador' por su cuenta:
    // quien quería dejar una cuenta sin permisos acababa dándole acceso a la
    // consola del robot sin enterarse. Ahora se respeta lo que se marcó y se
    // avisa de lo que implica.
    if (rolesArr.length === 0 && !window.confirm(t('adminUsuarios.sinRolConfirmar'))) return;
    const permisosExtra = formData.getAll('permisos_extra') as string[];
    const userData = {
      matricula: formData.get('matricula'),
      password: formData.get('password'),
      nombre: formData.get('nombre'),
      roles: rolesArr,
      permisos_extra: permisosExtra,
      grupo: formData.get('grupo'),
      alias: formData.get('alias')
    };

    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        setIsCreatingUser(false);
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.message);
      }
    } catch(e) {}
  };

  const handleUpdateUser = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rolesArr = formData.getAll('roles') as string[];
    // Antes, no marcar ninguna casilla asignaba 'operador' por su cuenta:
    // quien quería dejar una cuenta sin permisos acababa dándole acceso a la
    // consola del robot sin enterarse. Ahora se respeta lo que se marcó y se
    // avisa de lo que implica.
    if (rolesArr.length === 0 && !window.confirm(t('adminUsuarios.sinRolConfirmar'))) return;
    const permisosExtra = formData.getAll('permisos_extra') as string[];
    const userData = {
      password: formData.get('password'),
      nombre: formData.get('nombre'),
      roles: rolesArr,
      permisos_extra: permisosExtra,
      alias: formData.get('alias'),
      perfil_publico: perfilPublicoEdit
    };

    try {
      const res = await apiFetch(`/api/users/${editingUser.matricula}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.message);
      }
    } catch(e) {
      alert(t('alertas.errorConexionGenerico'));
    }
  };

  const handleDeleteUser = async (matricula: string) => {
    if (!window.confirm(t('adminUsuarios.confirmarEliminar'))) return;
    try {
      const res = await apiFetch(`/api/users/${matricula}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
      else {
        const d = await res.json();
        alert(d.message);
      }
    } catch(e) {}
  };

  const handleSaveRobot = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedRobot = {
        id: formData.get('id'),
        name: formData.get('name'),
        room: formData.get('room'),
        status: formData.get('status'),
        modelUrl: formData.get('modelUrl') || "",
        livekitUrl: formData.get('livekitUrl') || "",
        livekitApiKey: formData.get('livekitApiKey') || "",
        livekitApiSecret: formData.get('livekitApiSecret') || "",
        // Un checkbox desmarcado no aparece en el FormData: ausente = privado.
        isPublicEvent: formData.get('isPublicEvent') === 'on',
    };

    // Ping check para el servidor LiveKit
    if (updatedRobot.livekitUrl) {
      try {
        let pingUrl = updatedRobot.livekitUrl.toString();
        // Convertir wss:// a https:// para el ping HTTP
        pingUrl = pingUrl.replace(/^ws(s?):\/\//i, 'http$1://');
        
        // Simple fetch timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const pingRes = await fetch(pingUrl, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!pingRes.ok && pingRes.status !== 404) {
          if (!window.confirm(`${t('alertas.advertenciaLivekitEstado')} ${pingRes.status}. ${t('alertas.advertenciaGuardarTodosModos')}`)) return;
        }
      } catch (err) {
        if (!window.confirm(t('alertas.advertenciaLivekitPing'))) {
          return;
        }
      }
    }

    try {
      const method = editingRobot.isNew ? 'POST' : 'PUT';
      const url = editingRobot.isNew ? '/api/robots' : `/api/robots/${updatedRobot.id}`;

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRobot)
      });
      
      if (res.ok) {
        fetchRobots();
        setEditingRobot(null);
      } else {
        const d = await res.json();
        alert(d.message || t('alertas.errorGuardarRobot'));
      }
    } catch(e) {
      alert(t('alertas.errorConexionGenerico'));
    }
  };

  // El enlace que se le pasa al público durante un evento. No requiere sesión,
  // por eso solo tiene sentido copiarlo si el robot está marcado como público.
  const copiarEnlacePublico = async (robotId: string) => {
    const enlace = `${window.location.origin}/espectador/${robotId}`;
    try {
      await navigator.clipboard.writeText(enlace);
      alert(`${t('alertas.enlaceCopiado')}\n${enlace}`);
    } catch {
      // clipboard solo existe en contexto seguro (https/localhost).
      window.prompt(t('alertas.copiarEnlacePrompt'), enlace);
    }
  };

  const handleDeleteRobot = async (id: string) => {
    if (!window.confirm(t('alertas.confirmarEliminarRobot'))) return;
    try {
      const res = await apiFetch(`/api/robots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRobots();
      } else {
        const d = await res.json();
        alert(d.message);
      }
    } catch(e) {
      console.error(e);
    }
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

    try {
      const response = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula, password })
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        setView("welcome");
        setTimeout(() => {
          setView((currentView) => currentView === "welcome" ? "dashboard" : currentView);
        }, 2200);
      } else {
        setError(data.message || t('login.credencialesIncorrectas'));
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    } catch (err) {
      setError(t('login.errorInterno'));
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Best-effort: limpia las cookies de sesión en el servidor. El estado
    // local se limpia de inmediato sin esperar la respuesta.
    apiFetch('/api/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setView("login");
    setMatricula("");
    setPassword("");
  };

  // Único punto de entrada al editor de perfil. Antes había dos pantallas
  // distintas ("Personalizar Perfil" en la barra lateral y "Perfil de Usuario"
  // en el menú de Ajustes) que editaban campos diferentes del mismo usuario
  // contra el mismo endpoint; ahora las dos llegan aquí.
  // El catálogo de roles se pide al entrar al panel de personal: sirve para
  // las casillas del editor de usuario y para pintar las insignias.
  useEffect(() => {
    if (view !== 'admin_users') return;
    apiFetch('/api/roles')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setRolesDisponibles(d.roles ?? []);
        setCatalogoPermisos(d.catalogo ?? {});
      })
      .catch(() => {});
    apiFetch('/api/medallas')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setMedallasEspeciales(d.especiales ?? {}); })
      .catch(() => {});
  }, [view, pestanaPersonal]);

  // Se aplica al instante, sin esperar a "Actualizar usuario": una medalla no
  // es un campo del formulario, es un acto con fecha y firma. Mezclarla con el
  // guardado haría que cambiar un apellido y conceder un reconocimiento fueran
  // el mismo clic.
  const otorgarMedalla = async (clave: string, otorgar: boolean) => {
    if (!editingUser?.id) return;
    const motivo = motivosMedallas[clave] ?? '';
    const res = await apiFetch(`/api/miembros/${editingUser.id}/medallas/${clave}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otorgar, motivo }),
    });
    const datos = await res.json().catch(() => null);
    if (!res.ok) return alert(datos?.message || t('adminUsuarios.medallaError'));
    alert(otorgar ? t('adminUsuarios.medallaHecha') : t('adminUsuarios.medallaRetirada'));
    const yaTiene = { ...(editingUser.medallas ?? {}) };
    if (otorgar) yaTiene[clave] = motivo; else delete yaTiene[clave];
    setEditingUser({ ...editingUser, medallas: yaTiene });
    // La lista de detrás también, para no tener que recargar el panel entero
    // solo por ver la medalla puesta.
    setUsersList((lista) => lista.map((u) => (u.id === editingUser.id ? { ...u, medallas: yaTiene } : u)));
  };

  const openProfileEditor = () => {
    setProfileForm({
      alias: user?.alias || '',
      bio: user?.bio || '',
      foto: user?.foto || '',
      github: user?.github || '',
      linkedin: user?.linkedin || '',
      instagram: user?.instagram || '',
      reddit: user?.reddit || '',
      facebook: user?.facebook || '',
      perfil_publico: Boolean(user?.perfil_publico),
      rol_publico: user?.rol_publico || '',
      area: user?.area || '',
      generacion: user?.generacion || '',
    });
    // El editor vive dentro del dashboard, así que hay que aterrizar ahí
    // primero cuando se entra desde el menú suelto de Ajustes.
    setView("dashboard");
    setMainContext("edit_profile");
  };

  // Las preferencias se aplican al instante en la interfaz y se persisten en la
  // base en segundo plano, sin botón de guardar: un switch que hay que
  // confirmar aparte se siente roto. La respuesta del servidor manda, así que
  // el estado local acaba reflejando lo que de verdad quedó grabado.
  const persistPreferences = async (patch: Record<string, boolean>) => {
    // La pantalla de accesibilidad también es accesible sin sesión (desde el
    // login). Ahí no hay fila donde guardar: aplica solo a la vista actual.
    if (!user) return;
    try {
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setUser(data.user);
      } else {
        console.error('No se pudo guardar la preferencia:', data?.message);
      }
    } catch (e) {
      console.error('No se pudo guardar la preferencia:', e);
    }
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
          <a href={import.meta.env.BASE_URL} style={{ display: 'flex', alignItems: 'center' }}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="RUR Logo" className="topbar-logo" style={{ cursor: 'pointer' }} title="Volver al Inicio" />
          </a>
        </div>
        <div className="topbar-title">RESEARCH UNIT OF ROBOTICS</div>
        <div className="topbar-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div 
            className="topbar-icon" 
            aria-hidden="true"
            // Un solo destino desde cualquier punto. Antes el engrane abría una
            // pantalla distinta según si estabas en el dashboard o no, con los
            // mismos switches duplicados en las dos.
            onClick={() => setView("settings_menu")}
            title={t('dashboard.ajustesTitulo')}
          >
            <TechGearIcon />
          </div>
          {user && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleLogout}
              className="logout-btn-small"
            >
              {t('dashboard.salir')}
            </motion.button>
          )}
        </div>
      </header>
      )}

      <main className={view === "login" ? "container" : view === "controles" ? "controller-main" : "full-container"} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.section key="login" className="login-panel" {...pageTransition}>
              <div className="panel-header">
                <h1>{t('login.titulo')}</h1>
              </div>
              <form onSubmit={handleLogin} autoComplete="off">
                <div className={`input-group floating ${isShaking ? 'shake-error' : ''}`}>
                  <input 
                    type="text" 
                    id="matricula" 
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder=" " 
                  />
                  <label htmlFor="matricula">{t('login.matricula')}</label>
                  <span className="border-draw"></span>
                </div>

                <div className={`input-group floating ${isShaking ? 'shake-error' : ''}`}>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
                  />
                  <label htmlFor="password">{t('login.codigoAcceso')}</label>
                  <span className="border-draw"></span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '16px' }}>
                  <motion.button 
                    type="submit" 
                    disabled={isLoading}
                    whileTap={{ scale: 0.95 }}
                    initial={{ width: "100%", borderRadius: "4px" }}
                    animate={isLoading ? { 
                      backgroundColor: "transparent", 
                      color: "var(--accent)", 
                      border: "1px solid var(--accent)", 
                      width: "50px", 
                      height: "50px", 
                      borderRadius: "25px", 
                      padding: 0 
                    } : {
                      backgroundColor: "var(--accent)", 
                      color: "#000",
                      border: "none",
                      width: "100%",
                      height: "auto",
                      borderRadius: "4px",
                      padding: "16px"
                    }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    style={{ overflow: 'hidden' }}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div key="loader" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                          <Loader2 className="animate-spin" size={20} />
                        </motion.div>
                      ) : (
                        <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                          {t('login.iniciarSesion')}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
                
                <AnimatePresence>
                  {error && (
                    <motion.p 
                      className="message error" 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
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
                  {t('bienvenida.titulo')}
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
                      <p className="user-label">{t('dashboard.usuarioConectado')}</p>
                      <h2 style={{ margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>{user.nombre}</h2>
                      {user.alias && (
                        <p style={{ margin: '4px 0 0 0', color: 'var(--accent)', fontSize: '0.95rem', fontStyle: 'italic' }}>"{user.alias}"</p>
                      )}
                      {user.bio && (
                        <p style={{ margin: '8px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>{user.bio}</p>
                      )}
                    </div>
                    <div className="user-meta" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <p>{t('dashboard.matricula')}: <br/><strong style={{fontSize: '1rem', color: 'var(--text)'}}>{user.matricula}</strong></p>
                      <p>{t('dashboard.grupo')}: <br/><strong style={{fontSize: '1rem', color: 'var(--text)'}}>{user.grupo}</strong></p>
                      <p>{t('dashboard.telefono')}: <br/><strong style={{fontSize: '1rem', color: 'var(--text)'}}>{user.telefono}</strong></p>
                      <div>{t('dashboard.roles')}: <br/>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {(() => {
                            return getRoles(user).map((r: string) => {
                              let color = 'var(--text)';
                              let bg = 'var(--surface-strong)';
                              if (r === 'admin') { color = 'black'; bg = 'var(--accent)'; }
                              else if (r === 'redactor' || r === 'editor') { color = 'white'; bg = '#9b59b6'; }
                              else if (r === 'operador') { color = 'white'; bg = '#3498db'; }
                              else if (r === 'hardware') { color = 'white'; bg = '#2c3e50'; }
                              else if (r === 'software') { color = 'white'; bg = '#e67e22'; }
                              else if (r === 'miembro') { color = 'white'; bg = '#444'; }
                              return <span key={r} style={{ padding: '4px 8px', background: bg, color: color, borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', textTransform: 'uppercase' }}>{r}</span>
                            });
                          })()}
                        </div>
                      </div>
                      <p>{t('dashboard.estado')}: <strong style={{ color: "var(--success)" }}>{t('dashboard.online')}</strong></p>
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
                    onClick={openProfileEditor}
                  >
                    {t('dashboard.personalizarPerfil')}
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
                          <h1>{t('dashboard.panelPrincipal')}</h1>
                        </div>
                      </motion.div>

                      <motion.div className="action-grid" layout style={{ alignItems: 'start' }}>
                        {(() => {
                          // Cada panel pide el permiso que de verdad
                          // necesita para funcionar, el mismo que comprueba
                          // el servidor en sus rutas. Antes esto era una
                          // lista fija para "admin" y otra para el resto:
                          // crear un rol nuevo no cambiaba nada aquí, así
                          // que un rol a medida no servía para nada.
                          const PANELES = [
                            { permiso: 'publicaciones.editar',  title: t('dashboard.gestionPublicaciones'),   view: 'admin_content' },
                            { permiso: 'usuarios.gestionar',    title: t('dashboard.gestionUsuarios'),        view: 'admin_users' },
                            { permiso: 'logs.ver',              title: t('dashboard.logsGenerales'),          view: 'admin_logs' },
                            { permiso: 'robots.gestionar',      title: t('dashboard.administracionRobots'),   view: 'admin_config' },
                            { permiso: 'robots.operar',         title: t('dashboard.consolaOperador'),        view: 'controles' },
                            { permiso: 'transmision.gestionar', title: t('dashboard.transmision'),            view: 'transmision' },
                          ];
                          const actions: any[] = PANELES.filter((p) => puede(user, p.permiso));

                          if (actions.length === 0) {
                            return <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>{t('dashboard.sinHerramientas')}</p>;
                          }

                          return actions.map((action, idx) => {
                            const isActivating = loadingAction === action.view;
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
                                  } else if (!isActivating) {
                                    // Cancelar cualquier timer de una tarjeta anterior: sin esto,
                                    // un click en A seguido de otro en B antes de que pasen los
                                    // 1.2s dejaba dos timers corriendo, y el de A navegaba igual
                                    // aunque B fuera el último elegido.
                                    if (loadingActionTimerRef.current) {
                                      clearTimeout(loadingActionTimerRef.current);
                                    }
                                    setLoadingAction(action.view);
                                    loadingActionTimerRef.current = setTimeout(() => {
                                      setLoadingAction(null);
                                      setView(action.view);
                                      loadingActionTimerRef.current = null;
                                    }, 1200);
                                  }
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', ...(action.view === "controles" ? { background: 'var(--accent)', color: 'black' } : {}) }}
                              >
                                {isActivating && (
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 0.8, ease: "linear" }}
                                    style={{ position: 'absolute', top: 0, left: 0, bottom: 0, background: 'var(--accent)', opacity: 0.2, zIndex: 0 }}
                                  />
                                )}
                                <motion.span layout style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                                  {isActivating ? (
                                    <>{t('dashboard.conectando')} <span className="loading-dots">...</span></>
                                  ) : (
                                    <>{action.view === 'controles' ? <><ConsoleIcon /> {action.title}</> : action.title}</>
                                  )}
                                </motion.span>
                              </motion.div>
                            );
                          });
                        })()}
                      </motion.div>
                    </motion.div>
                  )}

                  {mainContext === "edit_profile" && (
                    <motion.div key="edit_profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <div className="panel-header" style={{ marginBottom: '32px' }}>
                        <h2 className="titulo-panel titulo-panel--acento">{t('perfil.titulo')}</h2>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '800px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="input-group">
                            <label>{t('perfil.alias')}</label>
                            <input type="text" placeholder={t('perfil.aliasPlaceholder')} value={profileForm.alias} onChange={e => setProfileForm({...profileForm, alias: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.bio')}</label>
                            <input type="text" placeholder={t('perfil.bioPlaceholder')} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.fotoLabel')}</label>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                if (file.size > 2 * 1024 * 1024) {
                                  alert(t('perfil.imagenPesada'));
                                  e.target.value = '';
                                  return;
                                }

                                const formData = new FormData();
                                formData.append('file', file);

                                try {
                                  const res = await apiFetch('/api/upload', {
                                    method: 'POST',
                                    body: formData
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.url) {
                                    setProfileForm({...profileForm, foto: data.url});
                                    alert(t('perfil.fotoSubidaTemporal'));
                                  } else {
                                    alert(data.error || data.message || t('perfil.errorSubirFoto'));
                                  }
                                } catch (err) {
                                  alert(t('perfil.errorConexionFoto'));
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
                                <CheckCircle size={14} /> {t('perfil.fotoSubida')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="input-group">
                            <label>{t('perfil.github')}</label>
                            <input type="text" placeholder="https://github.com/..." value={profileForm.github} onChange={e => setProfileForm({...profileForm, github: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.linkedin')}</label>
                            <input type="text" placeholder="https://linkedin.com/in/..." value={profileForm.linkedin} onChange={e => setProfileForm({...profileForm, linkedin: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.instagram')}</label>
                            <input type="text" placeholder="https://instagram.com/..." value={profileForm.instagram} onChange={e => setProfileForm({...profileForm, instagram: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.reddit')}</label>
                            <input type="text" placeholder={t('perfil.redditPlaceholder')} value={profileForm.reddit} onChange={e => setProfileForm({...profileForm, reddit: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.facebook')}</label>
                            <input type="text" placeholder="https://facebook.com/..." value={profileForm.facebook} onChange={e => setProfileForm({...profileForm, facebook: e.target.value})} />
                          </div>
                          {/* Perfil público. Aparecer o no en MIEMBROS lo
                              decide quien administra, así que aquí es un
                              estado que se lee, no un interruptor: los datos
                              se escriben igual, publicados o no, para que
                              estén listos el día que se publiquen. */}
                          <div className={`perfil-publico${profileForm.perfil_publico ? '' : ' perfil-publico--oculto'}`}>
                            <p className="perfil-publico__estado">
                              <span className="perfil-publico__titulo">
                                {profileForm.perfil_publico ? t('perfil.visible') : t('perfil.noVisible')}
                              </span>
                              <span className="perfil-publico__nota">
                                {profileForm.perfil_publico ? t('perfil.aparecerNota') : t('perfil.noVisibleNota')}
                              </span>
                            </p>

                            <div className="perfil-publico__campos">
                              <div className="input-group">
                                <label>{t('perfil.rolPublico')}</label>
                                <input type="text" maxLength={80} placeholder={t('perfil.rolPublicoPlaceholder')} value={profileForm.rol_publico} onChange={e => setProfileForm({...profileForm, rol_publico: e.target.value})} />
                              </div>
                              <div className="input-group">
                                <label>{t('perfil.area')}</label>
                                <select value={profileForm.area} onChange={e => setProfileForm({...profileForm, area: e.target.value})}>
                                  <option value="">{t('perfil.areaSinElegir')}</option>
                                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                                </select>
                              </div>
                              <div className="input-group">
                                <label>{t('perfil.generacion')}</label>
                                <input type="text" inputMode="numeric" maxLength={20} placeholder="2024" value={profileForm.generacion} onChange={e => setProfileForm({...profileForm, generacion: e.target.value})} />
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                              <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>{t('perfil.mostrarAlias')}</span>
                              <input type="checkbox" checked={showAlias} onChange={(e) => setShowAlias(e.target.checked)} style={{width: 'auto', cursor: 'pointer'}} />
                            </label>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                              <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>{t('perfil.recibirPush')}</span>
                              <input type="checkbox" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} style={{width: 'auto', cursor: 'pointer'}} />
                            </label>
                          </div>

                          <button className="primary-btn" style={{ marginTop: 'auto' }} onClick={async () => {
                            try {
                              // Un solo guardado para todo el perfil: los datos
                              // públicos del formulario y las dos preferencias,
                              // que antes vivían en una pantalla aparte.
                              // perfil_publico se queda fuera: el servidor lo
                              // ignora en esta ruta y mandarlo daría a entender
                              // que se puede cambiar desde aquí.
                              const { perfil_publico: _visible, ...datosPerfil } = profileForm;
                              const res = await apiFetch('/api/profile', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  ...datosPerfil,
                                  show_alias: showAlias,
                                  push_notifications: pushNotifications
                                })
                              });
                              const data = await res.json().catch(() => null);
                              if (res.ok && data?.success) {
                                setUser(data.user);
                                alert(t('perfil.perfilActualizado'));
                                setMainContext("modules");
                              } else {
                                alert(data?.message || t('perfil.errorGuardarPerfil'));
                              }
                            } catch (e) {
                              alert(t('perfil.errorConexion'));
                            }
                          }}>
                            {t('perfil.guardarCambios')}
                          </button>
                        </div>
                      </div>

                      <button className="back-link" style={{ marginTop: '32px' }} onClick={() => setMainContext("modules")}>{t('perfil.cancelarVolver')}</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </motion.section>
          )}
          {view === "transmision" && user && puede(user, "transmision.gestionar") && (
            <motion.section key="transmision" className="full-container" style={{ maxWidth: '100%', padding: '0 40px' }} {...pageTransition}>
              <Suspense fallback={
                <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Loader2 className="animate-spin" size={64} />
                </div>
              }>
                {/* Recibe los robots ya cargados en vez de pedirlos otra vez:
                    el panel solo compone direcciones, no necesita su propia
                    copia de la lista ni su propio estado de carga. */}
                <PanelTransmision robots={robots} onBack={() => setView("dashboard")} />
              </Suspense>
            </motion.section>
          )}
          {(() => {
            return view === "robot_selection" && user && puede(user, "robots.operar") && (
              <motion.section key="robot_selection" className="full-container" style={{ maxWidth: '100%', padding: '0 40px' }} {...pageTransition}>
                <Suspense fallback={
                  <div style={{ height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Loader2 className="animate-spin" size={64} style={{ marginBottom: '24px' }} />
                  </div>
                }>
                  <RobotSelection
                    robots={robots}
                    errorRobots={errorRobots}
                    onReintentar={fetchRobots}
                    onBack={() => setView("dashboard")}
                    onSelectRobot={(robot) => {
                      setLivekitToken(robot); // We repurpose this state to hold the entire robot object
                      setView("modo_control");
                    }}
                    controlMappings={user.control_mappings}
                    onUpdateMappings={async (newMappings) => {
                      try {
                        const res = await apiFetch('/api/profile/mappings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ control_mappings: newMappings })
                        });
                        if (res.ok) {
                          setUser({ ...user, control_mappings: newMappings });
                          alert(t('alertas.controlesGuardados'));
                        } else {
                          alert(t('alertas.errorGuardarControles'));
                        }
                      } catch (e) {
                        alert(t('perfil.errorConexion'));
                      }
                    }}
                  />
                </Suspense>
            </motion.section>
            );
          })()}

          {view === "modo_control" && user && puede(user, "robots.operar") && (
            <motion.section key="modo_control" className="full-container" style={{ maxWidth: '100%', padding: '0 40px' }} {...pageTransition}>
              <ModeSelect
                onBack={() => setView("robot_selection")}
                onSelectMode={(modo: string) => {
                  setControlMode(modo);
                  setView("controles");
                }}
              />
            </motion.section>
          )}

          {view === "controles" && livekitToken && (
            <motion.section key="controller" className="controller-view" {...pageTransition}>
              <Suspense fallback={
                <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Loader2 className="animate-spin" size={64} style={{ marginBottom: '24px' }} />
                  <h2 style={{ fontFamily: 'var(--font-titulo)', margin: 0 }}>{t('dashboard.inicializandoConsola')}</h2>
                </div>
              }>
                <ControllerApp
                  onBack={() => setView("modo_control")}
                  robot={livekitToken}
                  controlMappings={user.control_mappings}
                  mode={controlMode}
                />
              </Suspense>
            </motion.section>
          )}

          {view === "admin_content" && (
            <motion.section key="admin_content" className="full-container" {...pageTransition} style={{ maxWidth: '1400px', margin: '40px auto', display: 'flex', flexDirection: 'column' }}>
              
              <AdminContent onBack={() => setView("dashboard")} user={user} />
            </motion.section>
          )}

          {view === "admin_users" && (
            <motion.section key="admin_users" className="dashboard-card" {...pageTransition} style={{ marginTop: '120px', marginBottom: '60px' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 className="titulo-panel">{t('adminUsuarios.titulo')}</h2>
                  <div className="pestanas">
                    <button
                      className={`pestanas__boton${pestanaPersonal === 'personas' ? ' pestanas__boton--activa' : ''}`}
                      onClick={() => setPestanaPersonal('personas')}
                    >
                      {t('adminUsuarios.pestanaPersonas')}
                    </button>
                    <button
                      className={`pestanas__boton${pestanaPersonal === 'roles' ? ' pestanas__boton--activa' : ''}`}
                      onClick={() => { setPestanaPersonal('roles'); setIsCreatingUser(false); setEditingUser(null); }}
                    >
                      {t('adminUsuarios.pestanaRoles')}
                    </button>
                  </div>
                </div>
                {pestanaPersonal === 'personas' && !isCreatingUser && (
                  <button onClick={() => setIsCreatingUser(true)} style={{ background: 'var(--accent)', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-ibm-mono)' }}>{t('adminUsuarios.crearUsuario')}</button>
                )}
              </div>

              {pestanaPersonal === 'roles' ? (
                <PanelRoles />
              ) : (isCreatingUser || editingUser) ? (
                <div style={{ textAlign: 'left', marginBottom: '16px', padding: '20px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        {t('adminUsuarios.matriculaId')}
                        <input name="matricula" defaultValue={editingUser?.matricula} readOnly={!!editingUser} required style={{ padding: '12px', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', opacity: editingUser ? 0.5 : 1 }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        {t('adminUsuarios.contrasena')} {editingUser && t('adminUsuarios.enBlanco')}
                        <input name="password" type="password" required={!editingUser} style={{ padding: '12px', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        {t('adminUsuarios.nombreCompleto')}
                        <input name="nombre" defaultValue={editingUser?.nombre} required style={{ padding: '12px', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        {t('adminUsuarios.aliasNickname')}
                        <input name="alias" defaultValue={editingUser?.alias} style={{ padding: '12px', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
                        {t('adminUsuarios.rolesAsignados')}
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                          {/* Primero los roles que esta persona tiene pero que
                              YA NO EXISTEN en la tabla. Sin esto no salía su
                              casilla, y como el formulario manda solo lo
                              marcado, abrir la ficha y guardar se lo quitaba
                              en silencio. Aparece marcado y en rojo: quitarlo
                              tiene que ser una decisión, no un descuido. */}
                          {(editingUser?.roles ?? [])
                            .filter((n: string) => !rolesDisponibles.some(r => r.nombre === n))
                            .map((nombre: string) => (
                              <label key={nombre} title={t('adminUsuarios.rolInvalidoAyuda')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error)', cursor: 'pointer', flexDirection: 'row' }}>
                                <input type="checkbox" name="roles" value={nombre} defaultChecked style={{ width: 'auto', margin: 0, cursor: 'pointer' }} />
                                <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                                  {nombre} ⚠
                                </span>
                              </label>
                            ))}
                          {rolesDisponibles.map(rol => (
                            <label key={rol.nombre} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: rol.color, cursor: 'pointer', flexDirection: 'row' }}>
                              <input
                                type="checkbox"
                                name="roles"
                                value={rol.nombre}
                                defaultChecked={editingUser ? editingUser.roles?.includes(rol.nombre) : rol.nombre === 'operador'}
                                style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                              />
                              <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.78rem', letterSpacing: '0.08em' }}>{rol.nombre}</span>
                            </label>
                          ))}
                        </div>
                      </label>

                      {/* Permisos sueltos de esta persona, además de los que le
                          den sus roles. Es lo que evita inventar un rol entero
                          para una excepción de una sola persona. */}
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
                        {t('adminUsuarios.permisosExtra')}
                        <div className="permisos-extra">
                          {Object.entries(catalogoPermisos).map(([clave, descripcion]) => (
                            <label key={clave} className="permisos-extra__uno">
                              <input
                                type="checkbox"
                                name="permisos_extra"
                                value={clave}
                                defaultChecked={editingUser?.permisos_extra?.includes(clave)}
                              />
                              <span>
                                <span className="permisos-extra__nombre">{descripcion}</span>
                                <code>{clave}</code>
                              </span>
                            </label>
                          ))}
                        </div>
                      </label>
                    </div>
                    {/* Si esta persona sale en MIEMBROS. Antes lo decidía cada
                        quien desde su propio perfil; se movió aquí porque
                        publicar a alguien en la web del laboratorio es una
                        decisión de la unidad. Lo que se publica —a qué se
                        dedica, área, generación, foto— lo sigue escribiendo la
                        persona. Solo al editar: en un alta no hay todavía nada
                        que publicar. */}
                    {editingUser && (
                      <div className="visibilidad">
                        <label className="visibilidad__interruptor">
                          <span>
                            <span className="visibilidad__titulo">{t('adminUsuarios.perfilPublico')}</span>
                            <span className="visibilidad__nota">{t('adminUsuarios.perfilPublicoAyuda')}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={perfilPublicoEdit}
                            onChange={(e) => setPerfilPublicoEdit(e.target.checked)}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                        </label>
                        {/* Publicar a alguien que no ha rellenado su perfil deja
                            una ficha con el nombre y nada más. Se avisa aquí,
                            que es cuando se puede evitar. */}
                        {perfilPublicoEdit && !editingUser.rol_publico && (
                          <p className="visibilidad__aviso">{t('adminUsuarios.perfilPublicoVacio')}</p>
                        )}
                      </div>
                    )}

                    {/* Las medallas que no salen de los datos. Se pide el
                        motivo a propósito: sin él no se puede leer por qué la
                        tiene, y una medalla que no se explica es un adorno.
                        Queda registrado quién la dio.

                        Las otras tres —proyecto terminado, grandes aportes,
                        líder— no están aquí porque no se conceden: se cumplen
                        solas con los proyectos firmados. */}
                    {editingUser && (
                      <div className="excelencia">
                        <label className="excelencia__titulo">
                          {t('adminUsuarios.medallas')}
                          <Ayuda texto={t('adminUsuarios.medallasAyuda')} />
                        </label>
                        {Object.entries(medallasEspeciales).map(([clave, medalla]) => {
                          const tiene = editingUser.medallas?.[clave] !== undefined;
                          return (
                            <div key={clave} className={`medalla-otorgar${tiene ? ' medalla-otorgar--puesta' : ''}`}>
                              <p className="medalla-otorgar__nombre">
                                {medalla.nombre}
                                {tiene && <span className="medalla-otorgar__puesta">{t('adminUsuarios.medallaPuesta')}</span>}
                              </p>
                              <p className="medalla-otorgar__criterio">{medalla.descripcion}</p>
                              <textarea
                                value={motivosMedallas[clave] ?? ''}
                                onChange={(e) => setMotivosMedallas({ ...motivosMedallas, [clave]: e.target.value })}
                                placeholder={t('adminUsuarios.excelenciaMotivo')}
                                maxLength={500}
                                rows={2}
                              />
                              <div className="excelencia__acciones">
                                <button type="button" onClick={() => otorgarMedalla(clave, true)}>
                                  {tiene ? t('adminUsuarios.medallaActualizar') : t('adminUsuarios.excelenciaOtorgar')}
                                </button>
                                {tiene && (
                                  <button type="button" className="excelencia__retirar" onClick={() => otorgarMedalla(clave, false)}>
                                    {t('adminUsuarios.excelenciaRetirar')}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                      <button type="submit" style={{ flex: 1, background: 'var(--accent)', color: 'black', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{editingUser ? t('adminUsuarios.actualizarUsuario') : t('adminUsuarios.guardarUsuario')}</button>
                      <button type="button" onClick={() => { setIsCreatingUser(false); setEditingUser(null); }} style={{ flex: 1, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', padding: '12px', borderRadius: '4px', cursor: 'pointer' }}>{t('adminUsuarios.cancelar')}</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div style={{ textAlign: 'left', marginBottom: '16px', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>
                    <thead style={{ background: 'var(--background)' }}>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>{t('adminUsuarios.colMatricula')}</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>{t('adminUsuarios.colNombre')}</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>{t('adminUsuarios.colRoles')}</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>{t('adminUsuarios.colAccion')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => (
                        <tr key={u.matricula} style={{ borderBottom: '1px dashed var(--border)' }}>
                          <td style={{ padding: '12px', color: 'var(--text)' }}>{u.matricula}</td>
                          <td style={{ padding: '12px', color: 'var(--text)' }}>{u.nombre}</td>
                          {/* Insignias con el color de cada rol, no texto con
                              comas: el color se elige al crear el rol
                              precisamente para reconocerlo de un vistazo, y
                              aquí se estaba desperdiciando. Y una lista vacía
                              deja de ser una celda en blanco —que se lee como
                              un fallo de carga— para decir lo que es. */}
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(u.roles ?? []).length === 0 && (
                                <span className="roles__insignia roles__insignia--sin" title={t('adminUsuarios.sinRolAyuda')}>
                                  {t('adminUsuarios.sinRol')}
                                </span>
                              )}
                              {(u.roles ?? []).map((nombre: string) => {
                                const rol = rolesDisponibles.find((r) => r.nombre === nombre);
                                // Un rol que ya no existe en la tabla: se
                                // enseña en rojo en lugar de desaparecer sin
                                // más, que es lo que pasaba antes.
                                return rol ? (
                                  <span key={nombre} className="roles__insignia" style={{ borderColor: rol.color, color: rol.color }}>
                                    {nombre}
                                  </span>
                                ) : (
                                  <span key={nombre} className="roles__insignia roles__insignia--invalido" title={t('adminUsuarios.rolInvalidoAyuda')}>
                                    {nombre}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {/* Editar sí, también la propia cuenta: antes se
                                ocultaban los dos botones y eso dejaba sin poder
                                cambiarse ni el nombre. Lo que no se puede es
                                borrarse —ni quitarse la gestión de usuarios,
                                que lo impide el servidor—. */}
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button className="logout-btn-small" style={{borderColor: 'var(--accent)', color: 'var(--accent)'}} onClick={() => { setEditingUser(u); setMotivosMedallas({ ...(u.medallas ?? {}) }); setPerfilPublicoEdit(!!u.perfil_publico); }}>{t('adminUsuarios.editar')}</button>
                              {u.matricula !== user?.matricula && (
                                <button className="logout-btn-small" style={{borderColor: 'var(--error)', color: 'var(--error)'}} onClick={() => handleDeleteUser(u.matricula)}>{t('adminUsuarios.revocar')}</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button className="back-link" onClick={() => {
                if (isCreatingUser || editingUser) {
                  setIsCreatingUser(false);
                  setEditingUser(null);
                } else {
                  setView("dashboard");
                }
              }}>{t('adminUsuarios.volver')}</button>
            </motion.section>
          )}

          {view === "admin_logs" && (
            <motion.section key="admin_logs" className="full-container" style={{ maxWidth: '1200px', padding: '0 20px' }} {...pageTransition}>
              <div className="panel-header" style={{ marginBottom: '24px' }}>
              
                <h2 className="titulo-panel">{t('adminLogs.titulo')}</h2>
              </div>

              {crowdsecMetrics ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                  <div className="action-card" style={{ padding: '20px', background: 'var(--surface)' }}>
                    <div style={{ color: 'var(--accent)', fontSize: '2rem', fontWeight: 'bold' }}>{crowdsecMetrics.active_decisions}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('adminLogs.amenazasBloqueadas')}</div>
                  </div>
                  <div className="action-card" style={{ padding: '20px', background: 'var(--surface)' }}>
                    <div style={{ color: 'var(--error)', fontSize: '2rem', fontWeight: 'bold' }}>{crowdsecMetrics.banned_ips}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('adminLogs.ipsBaneadas')}</div>
                  </div>
                  <div className="action-card" style={{ padding: '20px', background: 'var(--surface)', gridColumn: 'span 2' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--text)' }}>{t('adminLogs.topEscenarios')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                      {crowdsecMetrics.top_scenarios?.map((s: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-ibm-mono)', color: 'var(--muted)', fontSize: '0.8rem' }}>{s.name}</span>
                          <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>{t('adminLogs.cargandoMetricas')}</div>
              )}

              <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', marginBottom: '12px', textAlign: 'left' }}>{t('adminLogs.registroSistema')}</h3>
              <div style={{ background: '#0a0a0a', border: '1px solid var(--border)', padding: '16px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', height: '350px', overflowY: 'auto', marginBottom: '24px', textAlign: 'left', borderRadius: '4px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
                {logsList.length === 0 ? (
                  <div style={{ color: 'var(--muted)' }}>{t('adminLogs.sinLogs')}</div>
                ) : (
                  logsList.map((log, i) => {
                    let color = 'var(--muted)';
                    if (log.type === 'success') color = 'var(--success)';
                    if (log.type === 'error') color = 'var(--error)';
                    if (log.type === 'warning') color = 'var(--warning)';
                    if (log.type === 'info') color = 'var(--accent)';
                    
                    const time = new Date(log.timestamp).toLocaleTimeString();
                    
                    return (
                      <div key={i} style={{ color, marginBottom: '8px', wordBreak: 'break-word', borderBottom: '1px dashed #222', paddingBottom: '4px' }}>
                        <span style={{ color: '#555' }}>[{time}]</span> <strong style={{ color }}>[{log.type.toUpperCase()}]</strong> <span style={{ color: '#ddd' }}>{log.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
              <button className="back-link" onClick={() => setView("dashboard")}>{t('adminLogs.volverPanel')}</button>
            </motion.section>
          )}

          {view === "admin_config" && (
            <motion.section key="admin_config" className="full-container" style={{ maxWidth: '1600px', padding: '0 40px' }} {...pageTransition}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', textAlign: 'left', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: 'var(--accent)' }}>{t('adminRobots.tituloTabla')}</h3>
                    <button onClick={() => setEditingRobot({ isNew: true, id: `rassor-${Date.now().toString().slice(-4)}`, name: '', room: '', status: 'online', modelUrl: '', livekitUrl: '', isPublicEvent: false })} style={{ background: 'var(--accent)', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-ibm-mono)' }}>{t('adminRobots.registrarNueva')}</button>
                </div>

                <div style={{ overflowX: 'auto', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colEstado')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colUnidad')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colId')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colRoom')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colTransmision')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colModelo')}</th>
                                <th style={{ padding: '16px', textAlign: 'right' }}>{t('adminRobots.colAcciones')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {robots.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.status === 'online' ? 'var(--success)' : 'var(--error)', boxShadow: `0 0 8px ${r.status === 'online' ? 'var(--success)' : 'var(--error)'}` }} />
                                            <span style={{ color: r.status === 'online' ? 'var(--success)' : 'var(--error)' }}>{r.status.toUpperCase()}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: 500, fontFamily: 'var(--font-ibm-mono)', fontSize: '0.95rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{r.name}</td>
                                    <td style={{ padding: '16px', color: 'var(--muted)' }}>{r.id}</td>
                                    <td style={{ padding: '16px', color: 'var(--accent)' }}>{r.room}</td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', letterSpacing: '0.05em', border: `1px solid ${r.isPublicEvent ? 'var(--accent)' : 'var(--border)'}`, color: r.isPublicEvent ? 'var(--accent)' : 'var(--muted)', background: r.isPublicEvent ? 'rgba(251,202,1,0.08)' : 'transparent' }}>
                                                {r.isPublicEvent ? <Globe size={12} /> : <Lock size={12} />} {r.isPublicEvent ? t('adminRobots.publica') : t('adminRobots.privada')}
                                            </span>
                                            {r.isPublicEvent && (
                                                <button onClick={() => copiarEnlacePublico(r.id)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.7rem', textDecoration: 'underline' }}>{t('adminRobots.copiarEnlace')}</button>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: 'var(--muted)' }}>{r.modelUrl || t('adminRobots.modeloPorDefecto')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button onClick={() => setEditingRobot(r)} style={{ background: 'transparent', color: 'white', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>{t('adminRobots.editar')}</button>
                                        <button onClick={() => handleDeleteRobot(r.id)} style={{ background: 'var(--error-muted)', color: 'var(--error)', border: '1px solid var(--error)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>{t('adminRobots.eliminar')}</button>
                                    </td>
                                </tr>
                            ))}
                            {robots.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: errorRobots ? 'var(--error)' : 'var(--muted)' }}>
                                        {errorRobots ? `${t('adminRobots.errorCargarUnidadesPrefijo')} ${errorRobots}` : t('adminRobots.sinUnidades')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* MODAL DE EDICIÓN (Overlay) */}
                {editingRobot && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
                        <div style={{ background: 'var(--background)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '32px', width: '100%', maxWidth: '600px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '24px', fontFamily: 'var(--font-titulo)', fontSize: '1.1rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 400 }}>
                                {editingRobot.isNew ? t('adminRobots.registrarNuevaUnidad') : t('adminRobots.editarUnidad')}
                            </h3>
                            <form onSubmit={handleSaveRobot} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        {t('adminRobots.idInterno')}
                                        <input name="id" defaultValue={editingRobot.id} readOnly={!editingRobot.isNew} required style={S.input} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        {t('adminRobots.nombrePublico')}
                                        <input name="name" defaultValue={editingRobot.name} required style={S.input} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        {t('adminRobots.livekitRoom')}
                                        <input name="room" defaultValue={editingRobot.room} required style={{ ...S.input, border: '1px solid var(--accent)' }} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        {t('adminRobots.estadoSimulacion')}
                                        <select name="status" defaultValue={editingRobot.status} style={S.input}>
                                            <option value="online">{t('adminRobots.onlineVerde')}</option>
                                            <option value="offline">{t('adminRobots.offlineRojo')}</option>
                                        </select>
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', gridColumn: 'span 2' }}>
                                        {t('adminRobots.urlLivekit')}
                                        <input name="livekitUrl" defaultValue={editingRobot.livekitUrl} placeholder="wss://rur-livekit-server-8b010r3b.livekit.cloud" style={S.input} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', gridColumn: 'span 1' }}>
                                        {t('adminRobots.livekitApiKey')}
                                        <input type="password" name="livekitApiKey" defaultValue={editingRobot.livekitApiKey} placeholder={t('adminRobots.apiSecretPlaceholder')} style={S.input} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', gridColumn: 'span 1' }}>
                                        {t('adminRobots.livekitApiSecret')}
                                        {/* Se deja vacío a propósito: el backend solo re-cifra si mandas
                                            un valor nuevo, así que vacío = conservar el ya guardado. */}
                                        <input type="password" name="livekitApiSecret" placeholder={editingRobot.livekitApiSecretMasked ? `${t('adminRobots.apiSecretGuardado')} (${editingRobot.livekitApiSecretMasked}) ${t('adminRobots.apiSecretReemplazar')}` : t('adminRobots.apiSecretPlaceholder')} style={S.input} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', gridColumn: 'span 2' }}>
                                        {t('adminRobots.rutaModelo')}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input ref={robotModelInputRef} name="modelUrl" defaultValue={editingRobot.modelUrl} placeholder="/models/mi-robot.glb" style={{ ...S.input, flex: 1 }} />
                                            <input type="file" accept=".glb,.gltf" onChange={handleRobotModelUpload} style={{ display: 'none' }} id="upload-robot-model" />
                                            <label htmlFor="upload-robot-model" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 16px', background: 'var(--surface-strong)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                {uploadingRobotModel ? t('adminRobots.subiendo') : <><Upload size={14} /> {t('adminRobots.subir')}</>}
                                            </label>
                                        </div>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', gridColumn: 'span 2', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        <input type="checkbox" name="isPublicEvent" defaultChecked={Boolean(editingRobot.isPublicEvent)} style={{ width: 'auto', marginTop: '3px', cursor: 'pointer' }} />
                                        <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span style={{ color: 'var(--text)', letterSpacing: '0.05em' }}>{t('adminRobots.transmisionPublica')}</span>
                                            <span style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                                                {t('adminRobots.transmisionDescripcion')} <span style={{ color: 'var(--accent)' }}>/espectador/{editingRobot.id}</span>{t('adminRobots.transmisionDescripcion2')}
                                            </span>
                                        </span>
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                    <button type="button" onClick={() => setEditingRobot(null)} style={{ padding: '12px 24px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--muted)', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)' }}>{t('adminRobots.cancelar')}</button>
                                    <button type="submit" style={{ padding: '12px 24px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-ibm-mono)' }}>{editingRobot.isNew ? t('adminRobots.registrar') : t('adminRobots.guardarCambios')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
              </div>
              <button className="back-link" onClick={() => setView("dashboard")}>{t('adminRobots.volverMenu')}</button>
            </motion.section>
          )}

          {view === "placeholder" && (
            <motion.section key="placeholder" className="dashboard-card" {...pageTransition}>
              <h1>{t('ajustes.enConstruccion')}</h1>
              <p>{t('ajustes.enConstruccionTexto')}</p>
              <button className="back-link" onClick={() => setView("dashboard")}>{t('ajustes.volver')}</button>
            </motion.section>
          )}
          {view === "settings_menu" && (
            <motion.section key="settings_menu" className="dashboard-card" {...pageTransition}>
              <div className="panel-header">
                <h2 style={{margin: '0', fontSize: '1.25rem'}}>{t('ajustes.menuAjustes')}</h2>
              </div>
              <p className="user-welcome">{t('ajustes.seleccionaApartado')}</p>
              <div className="action-grid" style={{ marginBottom: '24px' }}>
                <button className="action-card" onClick={() => setView("accessibility")}>
                  {t('ajustes.accesibilidad')}
                </button>
                {user && (
                  <button className="action-card" onClick={openProfileEditor}>
                    {t('ajustes.perfilUsuario')}
                  </button>
                )}
              </div>
              <button className="back-link" onClick={() => setView(user ? "dashboard" : "login")}>{t('ajustes.volverInicio')}</button>
            </motion.section>
          )}

          {view === "accessibility" && (
            <motion.section key="accessibility" className="dashboard-card" {...pageTransition}>
              <div className="panel-header">
                <h2 style={{margin: '0', fontSize: '1.25rem'}}>{t('ajustes.accesibilidad')}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', textAlign: 'left' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>{t('accesibilidad.textoGrande')}</span>
                  <input
                    type="checkbox"
                    style={{width: 'auto', cursor: 'pointer'}}
                    checked={largeText}
                    onChange={(e) => {
                      setLargeText(e.target.checked);
                      persistPreferences({ large_text: e.target.checked });
                    }}
                  />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>{t('accesibilidad.reducirAnimaciones')}</span>
                  <input
                    type="checkbox"
                    style={{width: 'auto', cursor: 'pointer'}}
                    checked={reduceAnimations}
                    onChange={(e) => {
                      setReduceAnimations(e.target.checked);
                      persistPreferences({ reduce_animations: e.target.checked });
                    }}
                  />
                </label>
                <div style={{ padding: '16px', border: '1px solid var(--border)', background: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>
                      <Languages size={14} /> {t('accesibilidad.idioma').toUpperCase()}
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>{t('accesibilidad.idiomaDescripcion')}</p>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <button type="button" onClick={() => setLang('es')} style={{ flex: 1, padding: '10px', background: lang === 'es' ? 'var(--surface-strong)' : 'transparent', color: lang === 'es' ? 'white' : 'var(--muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-ibm-mono)', cursor: 'pointer', borderRadius: '4px 0 0 4px', fontWeight: 'bold', fontSize: '0.8rem' }}>{t('accesibilidad.espanol')}</button>
                    <button type="button" onClick={() => setLang('en')} style={{ flex: 1, padding: '10px', background: lang === 'en' ? 'var(--surface-strong)' : 'transparent', color: lang === 'en' ? 'var(--accent)' : 'var(--muted)', border: '1px solid var(--border)', borderLeft: 'none', fontFamily: 'var(--font-ibm-mono)', cursor: 'pointer', borderRadius: '0 4px 4px 0', fontWeight: 'bold', fontSize: '0.8rem' }}>{t('accesibilidad.ingles')}</button>
                  </div>
                </div>
              </div>
              <button className="back-link" onClick={() => setView("settings_menu")}>{t('accesibilidad.atras')}</button>
            </motion.section>
          )}

        </AnimatePresence>
      </main>
    </div>
    </MotionConfig>
  );
}