import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Loader2, CheckCircle } from "lucide-react";
import "./index.css";
import { RobotSelection } from "./controller/RobotSelection";
import { apiFetch } from "./lib/apiClient";
import { sanitizeHtml } from "./lib/sanitizeHtml";

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

// Devuelve true si el usuario tiene AL MENOS uno de los roles pedidos.
function hasRole(user: any, ...roles: string[]): boolean {
  const owned = getRoles(user);
  return roles.some((role) => owned.includes(role));
}


const AdminContent = ({ onBack, user }: { onBack: () => void, user: any }) => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  const handleDelete = async (id: string) => {
    if(!window.confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;
    try {
      const res = await apiFetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPosts();
      else alert('No tienes permisos');
    } catch(err) { alert('Error al eliminar'); }
  };

  const toggleVisibility = async (post: any) => {
    try {
      const res = await apiFetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden: !post.isHidden })
      });
      if (res.ok) fetchPosts();
      else alert('No tienes permisos');
    } catch(err) { alert('Error al actualizar visibilidad'); }
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
      else alert("Error al subir la imagen");
    } catch(err) { alert("Error de conexión al subir imagen"); }
    setUploadingImage(false);
  };

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
        alert("Error al subir el modelo 3D");
      }
    } catch(err) { alert("Error de conexión al subir el modelo 3D"); }
    setUploadingRobotModel(false);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const postData = {
      title, type, image, category, modelUrl,
      content: (type === 'simple' || type === 'aviso' || type === 'evento' || type === '3d_model') ? content : 'Contenido Multi-página',
      pages: type === 'magazine' ? pages : [],
      countdownDate: (type === 'aviso' || type === 'evento') ? countdownDate : undefined
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
        alert(viewMode === 'edit' ? "Publicación actualizada" : "Publicación creada con éxito");
        setViewMode('list');
      } else {
        alert("No tienes permisos para guardar esta publicación.");
      }
    } catch(err) { alert("Error al conectar con el servidor."); }
    setIsSubmitting(false);
  };

  if (viewMode === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '60vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button className="back-link" onClick={onBack}>← Volver al Menú Principal</button>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-ibm-mono)', color: 'var(--text)' }}>GESTIÓN DE PUBLICACIONES</h2>
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
              <div style={{ fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', letterSpacing: '1px' }}>CREAR NUEVA</div>
              <div style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.8 }}>Sube tu propio HTML completo o crea un artículo simple.</div>
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
            const badgeText = post.type === 'magazine' ? 'REVISTA' : isAviso ? '⚠️ AVISO' : isEvento ? '⭐ EVENTO' : post.type === '3d_model' ? 'MODELO 3D' : 'SIMPLE';

            return (
            <div key={post.id} style={{ 
              border: `2px solid ${borderColor}`, 
              borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              background: bgColor, 
              transition: 'transform 0.3s ease, box-shadow 0.3s ease', 
              minHeight: '280px'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ height: '140px', width: '100%', background: 'var(--surface-strong)', backgroundImage: post.image ? `url(${post.image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, right: 12, background: badgeBg, padding: '4px 10px', borderRadius: '4px', border: (isAviso || isEvento) ? 'none' : '1px solid var(--accent)', color: badgeColor, fontSize: '0.7rem', fontFamily: 'var(--font-ibm-mono)', fontWeight: (isAviso || isEvento) ? 'bold' : 'normal' }}>
                  {badgeText}
                </div>
              </div>
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontFamily: 'var(--font-ibm-sans)', color: titleColor }}>{post.title}</h3>
                  <div style={{ display: 'inline-block', background: 'var(--surface-strong)', color: 'var(--muted)', fontSize: '0.7rem', fontFamily: 'var(--font-ibm-mono)', padding: '2px 6px', borderRadius: '4px', marginBottom: '8px', border: '1px solid var(--border)' }}>
                    DESTINO: {(post.category || 'landing').toUpperCase()}
                  </div>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {post.type === 'magazine' ? 'Revista interactiva de varias páginas.' : isAviso ? 'Anuncio destacado.' : isEvento ? 'Evento especial con fecha límite.' : post.type === '3d_model' ? 'Modelo 3D interactivo.' : 'Artículo de una sola página.'}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                  <button onClick={() => toggleVisibility(post)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--muted)', color: 'var(--muted)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--muted)'; e.currentTarget.style.color = 'var(--surface-strong)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
                  >
                    {post.isHidden ? '👁 MOSTRAR' : '🚫 OCULTAR'}
                  </button>
                  <button onClick={() => openEdit(post)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'black'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent)'; }}
                  >
                    MODIFICAR
                  </button>
                  <button onClick={() => handleDelete(post.id)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--error)'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--error)'; }}
                  >
                    ELIMINAR
                  </button>
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px', height: '100%', minHeight: '80vh' }}>
      {/* Sidebar de Configuración */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <button className="back-link" onClick={() => setViewMode('list')} style={{ marginBottom: '16px', alignSelf: 'flex-start' }}>← Cancelar / Volver</button>
        <h2 style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '1.25rem', margin: 0, color: 'var(--accent)' }}>{viewMode === 'edit' ? 'Modificar' : 'Crear'}</h2>
        
        <div className="input-group" style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Tipo de Publicación</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--font-ibm-sans)' }}>
              <option value="simple">Artículo Simple</option>
              <option value="magazine">Revista (Páginas Completas)</option>
              <option value="aviso">Aviso (Rojo)</option>
              <option value="evento">Evento (Dorado)</option>
              {hasRole(user, 'admin') && <option value="3d_model">Modelo 3D (Descubre)</option>}
            </select>
          </div>
          
          {hasRole(user, 'admin') && (
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Destino / Página</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--font-ibm-sans)' }}>
                <option value="landing">Revista Principal (Inicio)</option>
                <option value="explora">Página: Explora</option>
                <option value="descubre">Página: Descubre</option>
                <option value="conecta">Página: Conecta</option>
              </select>
            </div>
          )}
        </div>

        <div className="input-group">
          <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Título</label>
          <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título..." style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
        </div>

        {(type === 'aviso' || type === 'evento') && (
          <div className="input-group">
            <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: type === 'aviso' ? 'var(--error)' : 'var(--accent)', display: 'block', marginBottom: '8px' }}>Fecha de Expiración (Opcional)</label>
            <input type="datetime-local" value={countdownDate} onChange={(e) => setCountdownDate(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: `1px solid ${type === 'aviso' ? 'var(--error)' : 'var(--accent)'}`, borderRadius: '4px' }} />
          </div>
        )}

        <div className="input-group">
          <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Portada</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setImage)} style={{ display: 'none' }} id="upload-cover" />
            <label htmlFor="upload-cover" style={{ flex: 1, padding: '12px', background: 'var(--surface-strong)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>
              {uploadingImage ? 'SUBIENDO...' : '📁 SUBIR LOCAL'}
            </label>
          </div>
          <input type="text" value={image} onChange={(e) => setImage(e.target.value)} placeholder="O pega URL..." style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
        </div>

        <button onClick={handleSubmit} disabled={isSubmitting} className="action-card" style={{ background: 'var(--accent)', color: 'black', padding: '16px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: 'auto', fontSize: '1rem' }}>
          {isSubmitting ? 'Guardando...' : (viewMode === 'edit' ? 'GUARDAR CAMBIOS' : 'PUBLICAR AHORA')}
        </button>
      </div>

      {/* Editor Principal */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '32px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '1.25rem', margin: 0, color: 'var(--accent)' }}>Contenido HTML (100% Personalizable)</h2>
        
        {type === '3d_model' && (
          <div className="input-group">
            <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Ruta del Modelo 3D (.glb)</label>
            <input type="text" value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} placeholder="Ej. /models/BMO.glb" style={{ width: '100%', padding: '12px', background: 'var(--background)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
          </div>
        )}

        {(type === 'simple' || type === 'aviso' || type === 'evento' || type === '3d_model') ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', marginBottom: '16px' }}>
               <button type="button" onClick={() => setShowPreview(false)} style={{ flex: 1, padding: '12px', background: !showPreview ? 'var(--surface-strong)' : 'transparent', color: !showPreview ? 'white' : 'var(--muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-ibm-mono)', cursor: 'pointer', borderRadius: '4px 0 0 4px', fontWeight: 'bold' }}>CÓDIGO HTML</button>
               <button type="button" onClick={() => setShowPreview(true)} style={{ flex: 1, padding: '12px', background: showPreview ? 'var(--surface-strong)' : 'transparent', color: showPreview ? 'var(--accent)' : 'var(--muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-ibm-mono)', cursor: 'pointer', borderRadius: '0 4px 4px 0', borderLeft: 'none', fontWeight: 'bold' }}>VISTA PREVIA EN VIVO</button>
            </div>
            
            {!showPreview ? (
              <textarea required value={content} onChange={(e) => setContent(e.target.value)} placeholder="<h1>Mi Artículo</h1><p>Escribe HTML aquí...</p>" style={{ flex: 1, padding: '20px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', width: '100%', minHeight: '400px', resize: 'vertical', fontFamily: 'var(--font-ibm-mono)' }}></textarea>
            ) : (
              <div style={{ flex: 1, padding: (type === 'evento' || type === 'aviso') ? '0px' : '40px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--accent)', borderRadius: '4px', width: '100%', minHeight: '400px', overflowY: 'auto' }}>
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} style={{ lineHeight: '1.8' }} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {pages.map((page, idx) => (
              <div key={idx} style={{ background: 'var(--background)', border: '1px dashed var(--accent)', padding: '24px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '1.1rem' }}>Página {idx + 1}</strong>
                  {pages.length > 1 && (
                    <button type="button" onClick={() => setPages(pages.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>ELIMINAR PÁGINA</button>
                  )}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Fondo/Imagen de Página (Opcional)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => {
                      const newPages = [...pages];
                      newPages[idx].image = url;
                      setPages(newPages);
                    })} style={{ display: 'none' }} id={`upload-page-${idx}`} />
                    <label htmlFor={`upload-page-${idx}`} style={{ padding: '12px', background: 'var(--surface-strong)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      📁 SUBIR LOCAL
                    </label>
                    <input type="text" value={page.image || ''} onChange={(e) => {
                      const newPages = [...pages];
                      newPages[idx].image = e.target.value;
                      setPages(newPages);
                    }} placeholder="O pega URL..." style={{ flex: 1, padding: '12px', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
                  </div>
                </div>
                <label style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Estructura HTML Completa</label>
                <textarea required value={page.content} onChange={(e) => {
                  const newPages = [...pages];
                  newPages[idx].content = e.target.value;
                  setPages(newPages);
                }} placeholder={`<div style="padding: 40px;">\n  <h1>Página ${idx + 1}</h1>\n</div>`} style={{ padding: '20px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', width: '100%', minHeight: '300px', resize: 'vertical', fontFamily: 'var(--font-ibm-mono)' }}></textarea>
              </div>
            ))}
            <button type="button" onClick={() => setPages([...pages, { content: '', image: '' }])} style={{ padding: '16px', background: 'transparent', color: 'var(--accent)', border: '1px dashed var(--accent)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '1rem', width: '100%' }}>
              + AÑADIR NUEVA PÁGINA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


export default function App() {
  // Nada de estado en el navegador, tampoco el de navegación: al recargar se
  // arranca en login y /api/me decide a dónde se va, según la sesión real.
  const [view, setView] = useState("login");
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
  const [profileForm, setProfileForm] = useState({ alias: '', bio: '', foto: '', github: '', instagram: '', reddit: '', facebook: '' });
  
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

  // Users State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

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
    if (view === 'admin_users' && hasRole(user, 'admin')) {
      fetchUsers();
    }
  }, [view, user]);

  const handleCreateUser = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rolesArr = formData.getAll('roles') as string[];
    const userData = {
      matricula: formData.get('matricula'),
      password: formData.get('password'),
      nombre: formData.get('nombre'),
      roles: rolesArr.length > 0 ? rolesArr : ['operador'],
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
    const userData = {
      password: formData.get('password'),
      nombre: formData.get('nombre'),
      roles: rolesArr.length > 0 ? rolesArr : ['operador'],
      alias: formData.get('alias')
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
      alert("Error de conexión");
    }
  };

  const handleDeleteUser = async (matricula: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return;
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
          if (!window.confirm(`Advertencia: El servidor LiveKit respondió con estado ${pingRes.status}. ¿Deseas guardarlo de todos modos?`)) return;
        }
      } catch (err) {
        if (!window.confirm('Advertencia: No se pudo establecer conexión con el servidor LiveKit Cloud (Ping fallido). ¿Deseas guardarlo de todos modos?')) {
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
        alert(d.message || "Error al guardar el robot");
      }
    } catch(e) {
      alert("Error de conexión");
    }
  };

  // El enlace que se le pasa al público durante un evento. No requiere sesión,
  // por eso solo tiene sentido copiarlo si el robot está marcado como público.
  const copiarEnlacePublico = async (robotId: string) => {
    const enlace = `${window.location.origin}/espectador/${robotId}`;
    try {
      await navigator.clipboard.writeText(enlace);
      alert(`Enlace de espectador copiado:\n${enlace}`);
    } catch {
      // clipboard solo existe en contexto seguro (https/localhost).
      window.prompt('Copia el enlace de espectador:', enlace);
    }
  };

  const handleDeleteRobot = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este robot?')) return;
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
        setError(data.message || "Credenciales incorrectas.");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    } catch (err) {
      setError("Error interno.");
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
  const openProfileEditor = () => {
    setProfileForm({
      alias: user?.alias || '',
      bio: user?.bio || '',
      foto: user?.foto || '',
      github: user?.github || '',
      instagram: user?.instagram || '',
      reddit: user?.reddit || '',
      facebook: user?.facebook || ''
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
            title="Ajustes"
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
              Salir
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
                <span className="panel-label">Completar datos</span>
                <h1>Acceso al Sistema</h1>
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
                  <label htmlFor="matricula">Matrícula</label>
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
                  <label htmlFor="password">Código de Acceso</label>
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
                          Iniciar Sesión
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
                      <div>Roles: <br/>
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
                    onClick={openProfileEditor}
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
                        Módulos del Sistema (Vista de Panel):
                      </motion.p>
                      
                      <motion.div className="action-grid" layout style={{ alignItems: 'start' }}>
                        {(() => {
                          let actions: any[] = [];
                          if (hasRole(user, 'admin')) {
                            actions = [
                              { title: "Gestión de Publicaciones", view: "admin_content" },
                              { title: "Gestión de Usuarios", view: "admin_users" },
                              { title: "Logs Generales", view: "admin_logs" },
                              { title: "Administración de Robots", view: "admin_config" },
                              { title: "Consola del Operador", view: "controles" }
                            ];
                          } else {
                            if (hasRole(user, 'redactor', 'editor')) {
                              actions.push({ title: "Gestión de Publicaciones", view: "admin_content" });
                            }
                            if (hasRole(user, 'operador')) {
                              actions.push({ title: "Consola del Operador", view: "controles" });
                            }
                          }
                          
                          if (actions.length === 0) {
                            return <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No hay herramientas disponibles para tu rol.</p>;
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
                                    setLoadingAction(action.view);
                                    setTimeout(() => {
                                      setLoadingAction(null);
                                      setView(action.view);
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
                                    <>Conectando <span className="loading-dots">...</span></>
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
                                formData.append('file', file);

                                try {
                                  const res = await apiFetch('/api/upload', {
                                    method: 'POST',
                                    body: formData
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.url) {
                                    setProfileForm({...profileForm, foto: data.url});
                                    alert("Foto subida temporalmente. Dale a 'Guardar Cambios' para confirmar.");
                                  } else {
                                    alert(data.error || data.message || "Error al subir foto");
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                              <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>MOSTRAR ALIAS EN TABLERO</span>
                              <input type="checkbox" checked={showAlias} onChange={(e) => setShowAlias(e.target.checked)} style={{width: 'auto', cursor: 'pointer'}} />
                            </label>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                              <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>RECIBIR NOTIFICACIONES PUSH</span>
                              <input type="checkbox" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} style={{width: 'auto', cursor: 'pointer'}} />
                            </label>
                          </div>

                          <button className="primary-btn" style={{ marginTop: 'auto' }} onClick={async () => {
                            try {
                              // Un solo guardado para todo el perfil: los datos
                              // públicos del formulario y las dos preferencias,
                              // que antes vivían en una pantalla aparte.
                              const res = await apiFetch('/api/profile', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  ...profileForm,
                                  show_alias: showAlias,
                                  push_notifications: pushNotifications
                                })
                              });
                              const data = await res.json().catch(() => null);
                              if (res.ok && data?.success) {
                                setUser(data.user);
                                alert("Perfil actualizado con éxito.");
                                setMainContext("modules");
                              } else {
                                alert(data?.message || "Error al guardar perfil.");
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
          {(() => {
            return view === "robot_selection" && user && hasRole(user, "operador", "admin") && (
              <motion.section key="robot_selection" className="full-container" style={{ maxWidth: '100%', padding: '0 40px' }} {...pageTransition}>
                <RobotSelection 
                  robots={robots}
                  errorRobots={errorRobots}
                  onReintentar={fetchRobots}
                  onBack={() => setView("dashboard")}
                  onSelectRobot={(robot) => {
                    setLivekitToken(robot); // We repurpose this state to hold the entire robot object
                    setView("controles");
                  }}
                  onAddRobot={(newRobot) => {
                    setRobots(prev => [...prev, newRobot]);
                  }}
                  onUpdateRobot={async (updatedRobot) => {
                    setRobots(prev => prev.map(r => r.id === updatedRobot.id ? updatedRobot : r));
                    try {
                      await apiFetch(`/api/robots/${updatedRobot.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedRobot)
                      });
                    } catch (e) {
                      console.error("Error al guardar robot en backend:", e);
                    }
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
            );
          })()}

          {view === "controles" && livekitToken && (
            <motion.section key="controller" className="controller-view" {...pageTransition}>
              <Suspense fallback={
                <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Loader2 className="animate-spin" size={64} style={{ marginBottom: '24px' }} />
                  <h2 style={{ fontFamily: 'var(--font-ibm-mono)', margin: 0 }}>INICIALIZANDO CONSOLA...</h2>
                </div>
              }>
                <ControllerApp 
                  onBack={() => setView("robot_selection")} 
                  robot={livekitToken}
                  controlMappings={user.control_mappings}
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
                  <span className="panel-label">ADMINISTRADOR</span>
                  <h2 style={{margin: '0', fontSize: '1.25rem'}}>Gestión de Usuarios</h2>
                </div>
                {!isCreatingUser && (
                  <button onClick={() => setIsCreatingUser(true)} style={{ background: 'var(--accent)', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-ibm-mono)' }}>+ Crear Usuario</button>
                )}
              </div>
              
              {(isCreatingUser || editingUser) ? (
                <div style={{ textAlign: 'left', marginBottom: '16px', padding: '20px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        Matrícula / ID
                        <input name="matricula" defaultValue={editingUser?.matricula} readOnly={!!editingUser} required style={{ padding: '12px', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', opacity: editingUser ? 0.5 : 1 }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        Contraseña {editingUser && "(En blanco para mantenerla)"}
                        <input name="password" type="password" required={!editingUser} style={{ padding: '12px', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        Nombre Completo
                        <input name="nombre" defaultValue={editingUser?.nombre} required style={{ padding: '12px', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        Alias / Nickname
                        <input name="alias" defaultValue={editingUser?.alias} style={{ padding: '12px', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
                        Roles Asignados
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                          {['admin', 'redactor', 'operador', 'hardware'].map(role => (
                            <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', cursor: 'pointer', flexDirection: 'row' }}>
                              <input 
                                type="checkbox" 
                                name="roles" 
                                value={role} 
                                defaultChecked={editingUser ? editingUser.roles?.includes(role) : role === 'operador'} 
                                style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                              />
                              <span style={{ textTransform: 'capitalize' }}>{role}</span>
                            </label>
                          ))}
                        </div>
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                      <button type="submit" style={{ flex: 1, background: 'var(--accent)', color: 'black', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{editingUser ? 'Actualizar Usuario' : 'Guardar Usuario'}</button>
                      <button type="button" onClick={() => { setIsCreatingUser(false); setEditingUser(null); }} style={{ flex: 1, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', padding: '12px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div style={{ textAlign: 'left', marginBottom: '16px', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>
                    <thead style={{ background: 'var(--background)' }}>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Matrícula</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Roles</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => (
                        <tr key={u.matricula} style={{ borderBottom: '1px dashed var(--border)' }}>
                          <td style={{ padding: '12px', color: 'var(--text)' }}>{u.matricula}</td>
                          <td style={{ padding: '12px', color: 'var(--text)' }}>{u.nombre}</td>
                          <td style={{ padding: '12px', color: 'var(--accent)' }}>{u.roles?.join(', ')}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {u.matricula !== user?.matricula && (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="logout-btn-small" style={{borderColor: 'var(--accent)', color: 'var(--accent)'}} onClick={() => setEditingUser(u)}>Editar</button>
                                <button className="logout-btn-small" style={{borderColor: 'var(--error)', color: 'var(--error)'}} onClick={() => handleDeleteUser(u.matricula)}>Revocar</button>
                              </div>
                            )}
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
              }}>« Volver</button>
            </motion.section>
          )}

          {view === "admin_logs" && (
            <motion.section key="admin_logs" className="full-container" style={{ maxWidth: '1200px', padding: '0 20px' }} {...pageTransition}>
              <div className="panel-header" style={{ marginBottom: '24px' }}>
              
                <h2 style={{margin: '0', fontSize: '1.5rem'}}>Centro de Seguridad (CrowdSec) & Logs</h2>
              </div>

              {crowdsecMetrics ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                  <div className="action-card" style={{ padding: '20px', background: 'var(--surface)' }}>
                    <div style={{ color: 'var(--accent)', fontSize: '2rem', fontWeight: 'bold' }}>{crowdsecMetrics.active_decisions}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Amenazas Activas Bloqueadas</div>
                  </div>
                  <div className="action-card" style={{ padding: '20px', background: 'var(--surface)' }}>
                    <div style={{ color: 'var(--error)', fontSize: '2rem', fontWeight: 'bold' }}>{crowdsecMetrics.banned_ips}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>IPs Baneadas (Histórico)</div>
                  </div>
                  <div className="action-card" style={{ padding: '20px', background: 'var(--surface)', gridColumn: 'span 2' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--text)' }}>Top Escenarios de Ataque</h3>
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
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>Cargando métricas de CrowdSec...</div>
              )}

              <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', marginBottom: '12px', textAlign: 'left' }}>Registro del Sistema (API Logs)</h3>
              <div style={{ background: '#0a0a0a', border: '1px solid var(--border)', padding: '16px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', height: '350px', overflowY: 'auto', marginBottom: '24px', textAlign: 'left', borderRadius: '4px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
                {logsList.length === 0 ? (
                  <div style={{ color: 'var(--muted)' }}>No hay logs registrados todavía.</div>
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
              <button className="back-link" onClick={() => setView("dashboard")}>« Volver al Panel</button>
            </motion.section>
          )}

          {view === "admin_config" && (
            <motion.section key="admin_config" className="full-container" style={{ maxWidth: '1600px', padding: '0 40px' }} {...pageTransition}>
              <div className="panel-header">
                <span className="panel-label">ADMINISTRADOR</span>
                <h2 style={{margin: '0', fontSize: '1.25rem'}}>Configuración y Unidades</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', textAlign: 'left', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: 'var(--accent)' }}>Administración de Robots (Base de Datos)</h3>
                    <button onClick={() => setEditingRobot({ isNew: true, id: `rassor-${Date.now().toString().slice(-4)}`, name: '', room: '', status: 'online', modelUrl: '', livekitUrl: '', isPublicEvent: false })} style={{ background: 'var(--accent)', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-ibm-mono)' }}>+ Registrar Nueva Unidad</button>
                </div>

                <div style={{ overflowX: 'auto', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                                <th style={{ padding: '16px' }}>ESTADO</th>
                                <th style={{ padding: '16px' }}>UNIDAD (NOMBRE)</th>
                                <th style={{ padding: '16px' }}>ID INTERNO</th>
                                <th style={{ padding: '16px' }}>LIVEKIT ROOM</th>
                                <th style={{ padding: '16px' }}>TRANSMISIÓN</th>
                                <th style={{ padding: '16px' }}>MODELO 3D (.glb)</th>
                                <th style={{ padding: '16px', textAlign: 'right' }}>ACCIONES</th>
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
                                            <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', letterSpacing: '0.05em', border: `1px solid ${r.isPublicEvent ? 'var(--accent)' : 'var(--border)'}`, color: r.isPublicEvent ? 'var(--accent)' : 'var(--muted)', background: r.isPublicEvent ? 'rgba(251,202,1,0.08)' : 'transparent' }}>
                                                {r.isPublicEvent ? '◉ PÚBLICA' : '🔒 PRIVADA'}
                                            </span>
                                            {r.isPublicEvent && (
                                                <button onClick={() => copiarEnlacePublico(r.id)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.7rem', textDecoration: 'underline' }}>copiar enlace</button>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: 'var(--muted)' }}>{r.modelUrl || 'Modelo por defecto'}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button onClick={() => setEditingRobot(r)} style={{ background: 'transparent', color: 'white', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>Editar</button>
                                        <button onClick={() => handleDeleteRobot(r.id)} style={{ background: 'var(--error-muted)', color: 'var(--error)', border: '1px solid var(--error)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                            {robots.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>No hay unidades registradas.</td>
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
                                        <input name="id" defaultValue={editingRobot.id} readOnly={!editingRobot.isNew} required style={S.input} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        Nombre Público (Display Name)
                                        <input name="name" defaultValue={editingRobot.name} required style={S.input} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        LiveKit Room (Para la conexión)
                                        <input name="room" defaultValue={editingRobot.room} required style={{ ...S.input, border: '1px solid var(--accent)' }} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        Estado (Simulación Local)
                                        <select name="status" defaultValue={editingRobot.status} style={S.input}>
                                            <option value="online">Online (Verde)</option>
                                            <option value="offline">Offline (Rojo)</option>
                                        </select>
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', gridColumn: 'span 2' }}>
                                        URL de LiveKit Cloud (Opcional, sobrescribe VITE_LIVEKIT_URL)
                                        <input name="livekitUrl" defaultValue={editingRobot.livekitUrl} placeholder="wss://rur-livekit-server-8b010r3b.livekit.cloud" style={S.input} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', gridColumn: 'span 1' }}>
                                        LiveKit API Key
                                        <input type="password" name="livekitApiKey" defaultValue={editingRobot.livekitApiKey} placeholder="API Key" style={S.input} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', gridColumn: 'span 1' }}>
                                        LiveKit API Secret
                                        {/* Se deja vacío a propósito: el backend solo re-cifra si mandas
                                            un valor nuevo, así que vacío = conservar el ya guardado. */}
                                        <input type="password" name="livekitApiSecret" placeholder={editingRobot.livekitApiSecretMasked ? `Guardado (${editingRobot.livekitApiSecretMasked}) — escribe uno nuevo para reemplazarlo` : 'API Secret'} style={S.input} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)', gridColumn: 'span 2' }}>
                                        Ruta del Modelo 3D (.glb) - Opcional
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input ref={robotModelInputRef} name="modelUrl" defaultValue={editingRobot.modelUrl} placeholder="/models/mi-robot.glb" style={{ ...S.input, flex: 1 }} />
                                            <input type="file" accept=".glb,.gltf" onChange={handleRobotModelUpload} style={{ display: 'none' }} id="upload-robot-model" />
                                            <label htmlFor="upload-robot-model" style={{ padding: '12px 16px', background: 'var(--surface-strong)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                {uploadingRobotModel ? 'SUBIENDO...' : '📁 SUBIR'}
                                            </label>
                                        </div>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', gridColumn: 'span 2', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        <input type="checkbox" name="isPublicEvent" defaultChecked={Boolean(editingRobot.isPublicEvent)} style={{ width: 'auto', marginTop: '3px', cursor: 'pointer' }} />
                                        <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span style={{ color: 'var(--text)', letterSpacing: '0.05em' }}>TRANSMISIÓN PÚBLICA (MODO EVENTO)</span>
                                            <span style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                                                Activada, cualquier persona sin cuenta puede ver el video en <span style={{ color: 'var(--accent)' }}>/espectador/{editingRobot.id}</span>. El espectador es de solo lectura y nunca puede controlar la unidad, pero la transmisión queda abierta a todo internet: déjala apagada mientras no haya un evento en curso.
                                            </span>
                                        </span>
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                    <button type="button" onClick={() => setEditingRobot(null)} style={{ padding: '12px 24px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--muted)', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)' }}>Cancelar</button>
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
                  <button className="action-card" onClick={openProfileEditor}>
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
                    onChange={(e) => {
                      setLargeText(e.target.checked);
                      persistPreferences({ large_text: e.target.checked });
                    }}
                  />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>REDUCIR ANIMACIONES</span>
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
              </div>
              <button className="back-link" onClick={() => setView("settings_menu")}>← Atrás</button>
            </motion.section>
          )}

        </AnimatePresence>
      </main>
    </div>
    </MotionConfig>
  );
}