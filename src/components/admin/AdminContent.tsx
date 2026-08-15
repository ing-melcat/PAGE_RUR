import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TriangleAlert, Star, Eye, EyeOff, Upload, X, ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "../../lib/apiClient";
import { sanitizeHtml } from "../../lib/sanitizeHtml";
import { useLanguage } from "../../lib/i18n";
import { Ayuda } from "../Ayuda";
import { puede } from "../../lib/authUtils";

import { usePosts, useMutatePost } from "../../hooks/queries/usePosts";
import { usePersonas } from "../../hooks/queries/useUsers";

export const AdminContent = ({ onBack, user }: { onBack: () => void, user: any }) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'list'|'create'|'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: postsList = [], isLoading: postsLoading } = usePosts();
  const { data: personas = [] } = usePersonas(puede(user, 'publicaciones.firmar'));
  const mutatePost = useMutatePost();

  const [type, setType] = useState('simple');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [pages, setPages] = useState([{ content: '', image: '', _key: Math.random().toString() }]);
  const [countdownDate, setCountdownDate] = useState('');
  const [category, setCategory] = useState('landing');
  const [modelUrl, setModelUrl] = useState('');
  const [autores, setAutores] = useState<{ _key?: string; userId: number; papel: string; lider: boolean }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEjemplos, setShowEjemplos] = useState(false);

  const handleDelete = async (id: string) => {
    if(!window.confirm(t('alertas.confirmarEliminarPublicacion'))) return;
    try {
      await mutatePost.mutateAsync({ id, method: 'DELETE' });
    } catch(err: any) { 
      if (err.message.includes('Error al guardar')) alert(t('alertas.errorEliminar'));
      else alert(t('alertas.sinPermisos'));
    }
  };

  const toggleVisibility = async (post: any) => {
    try {
      await mutatePost.mutateAsync({ 
        id: post.id, 
        method: 'PUT', 
        postData: { isHidden: !post.isHidden } 
      });
    } catch(err) { alert(t('alertas.errorActualizarVisibilidad')); }
  };

  const openEdit = (post: any) => {
    setEditingId(post.id);
    if (post.type === 'simple' || post.type === 'aviso' || post.type === 'evento' || post.type === '3d_model') {
      setContent(post.content || '');
    } else {
      setPages(post.pages && post.pages.length > 0 ? post.pages.map((p: any) => ({ ...p, _key: Math.random().toString() })) : [{ content: '', image: '', _key: Math.random().toString() }]);
    }
    setType(post.type || 'simple');
    setTitle(post.title || '');
    setImage(post.image || '');
    setCountdownDate(post.countdownDate || '');
    setModelUrl(post.modelUrl || '');
    setAutores((post.autores || []).map((a: any) => ({ _key: Math.random().toString(), userId: a.id, papel: a.papel || '', lider: Boolean(a.lider) })));
    setViewMode('edit');
  };

  const resetForm = () => {
    setEditingId(null);
    setType('simple');
    setTitle('');
    setContent('');
    setImage('');
    setCountdownDate('');
    setPages([{ content: '', image: '', _key: Math.random().toString() }]);
    setModelUrl('');
    setAutores([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const isValid = await new Promise<boolean>((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        if (img.width < 1280 || img.height < 720) {
          alert(`La imagen es muy pequeña (${img.width}x${img.height}).\nPara que se vea nítida en todas las pantallas, debe medir al menos 1280x720 píxeles.`);
          resolve(false);
        } else if (Math.abs(aspect - 16/9) > 0.02) {
          alert(`Para mantener el diseño actual, la imagen debe ser exactamente 16:9 (ej. 1920x1080 o 1280x720).\n\nTu imagen mide ${img.width}x${img.height} píxeles. Por favor expórtala en 16:9 para evitar recortes.`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });

    if (!isValid) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    setUploadingImage(true);
    try {
      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
         alert('Error del servidor: Posiblemente la imagen es demasiado grande o hubo un error de red.');
         setUploadingImage(false);
         return;
      }
      const data = await response.json();
      if (data.url) callback(data.url);
      else alert(t('alertas.errorSubirImagen'));
    } catch(err) { alert(t('alertas.errorConexionImagen')); }
    setUploadingImage(false);
  };

  const isSubmitting = mutatePost.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const postData = {
      title, type, image, category, modelUrl,
      content: (type === 'simple' || type === 'aviso' || type === 'evento' || type === '3d_model') ? content : 'Contenido Multi-página',
      pages: type === 'magazine' ? pages.map((p: any) => { const { _key, ...rest } = p; return rest; }) : [],
      countdownDate: (type === 'aviso' || type === 'evento') ? countdownDate : undefined,
      autores: puede(user, 'publicaciones.firmar') ? autores.filter(a => a.userId) : undefined,
    };

    try {
      await mutatePost.mutateAsync({
        id: viewMode === 'edit' ? editingId! : undefined,
        method: viewMode === 'edit' ? 'PUT' : 'POST',
        postData
      });
      alert(viewMode === 'edit' ? t('alertas.publicacionActualizada') : t('alertas.publicacionCreada'));
      setViewMode('list');
    } catch(err) { 
      alert(t('alertas.errorConectarServidor')); 
    }
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
                  <button onClick={() => handleDelete(post.id)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--muted)', color: 'var(--muted)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--muted)'; e.currentTarget.style.color = 'var(--background)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>{t('adminPublicaciones.tipoLabel')}</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="simple">{t('adminPublicaciones.tipoSimpleOption')}</option>
              <option value="magazine">{t('adminPublicaciones.tipoMagazineOption')}</option>
              <option value="aviso">{t('adminPublicaciones.tipoAvisoOption')}</option>
              <option value="evento">{t('adminPublicaciones.tipoEventoOption')}</option>
              {puede(user, 'publicaciones.firmar') && <option value="3d_model">{t('adminPublicaciones.tipoModelo3dOption')}</option>}
            </select>
          </div>

          {puede(user, 'publicaciones.firmar') && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>{t('adminPublicaciones.destinoLabel')}</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="landing">{t('adminPublicaciones.destinoLanding')}</option>
                <option value="explora">{t('adminPublicaciones.destinoExplora')}</option>
                <option value="descubre">{t('adminPublicaciones.destinoDescubre')}</option>
                <option value="conecta">{t('adminPublicaciones.destinoConecta')}</option>
              </select>
            </div>
          )}
        </div>

        <div className="input-group">
          <label>{t('adminPublicaciones.tituloLabel')}</label>
          <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('adminPublicaciones.tituloPlaceholder')} />
        </div>

        {(type === 'aviso' || type === 'evento') && (
          <div className="input-group">
            <label style={{ color: type === 'aviso' ? 'var(--error)' : 'var(--accent)' }}>{t('adminPublicaciones.fechaExpiracion')}</label>
            <input type="datetime-local" value={countdownDate} onChange={(e) => setCountdownDate(e.target.value)} style={{ borderColor: type === 'aviso' ? 'var(--error)' : 'var(--accent)' }} />
          </div>
        )}

        <div className="input-group">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>{t('adminPublicaciones.portada')}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Min: 1280x720 | 16:9</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setImage)} style={{ display: 'none' }} id="upload-cover" />
            <label htmlFor="upload-cover" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: 'var(--surface-strong)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>
              {uploadingImage ? t('adminPublicaciones.subiendo') : <><Upload size={14} /> {t('adminPublicaciones.subirLocal')}</>}
            </label>
          </div>
          <input type="text" value={image} onChange={(e) => setImage(e.target.value)} placeholder={t('adminPublicaciones.urlPlaceholder')} />
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
              <div key={a._key || i} className="autores__fila">
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

        <button onClick={handleSubmit} disabled={isSubmitting} className="action-card" style={{ marginTop: 'auto' }}>
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
            <label>{t('adminPublicaciones.rutaModelo3d')}</label>
            <input type="text" value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} placeholder="Ej. /models/BMO.glb" />
          </div>
        )}

        {(type === 'simple' || type === 'aviso' || type === 'evento' || type === '3d_model') ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', marginBottom: '16px' }}>
               <button type="button" onClick={() => setShowPreview(false)} style={{ flex: 1, padding: '12px', background: !showPreview ? 'var(--surface-strong)' : 'transparent', color: !showPreview ? 'white' : 'var(--muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-ibm-mono)', cursor: 'pointer', borderRadius: '4px 0 0 4px', fontWeight: 'bold' }}>{t('adminPublicaciones.codigoHtml')}</button>
               <button type="button" onClick={() => setShowPreview(true)} style={{ flex: 1, padding: '12px', background: showPreview ? 'var(--surface-strong)' : 'transparent', color: showPreview ? 'var(--accent)' : 'var(--muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-ibm-mono)', cursor: 'pointer', borderRadius: '0 4px 4px 0', borderLeft: 'none', fontWeight: 'bold' }}>{t('adminPublicaciones.vistaPrevia')}</button>
            </div>

            {!showPreview ? (
              <textarea required value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('adminPublicaciones.htmlPlaceholder')} style={{ minHeight: '400px', resize: 'vertical' }}></textarea>
            ) : (
              <div style={{ flex: 1, padding: (type === 'evento' || type === 'aviso') ? '0px' : '40px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--accent)', borderRadius: '4px', width: '100%', minHeight: '400px', overflowY: 'auto' }}>
                <div className="contenido-publicacion" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {pages.map((page, idx) => (
              <div key={page._key || idx} style={{ background: 'var(--background)', border: '1px dashed var(--accent)', padding: '24px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '1.1rem' }}>{t('adminPublicaciones.pagina')} {idx + 1}</strong>
                  {pages.length > 1 && (
                    <button type="button" onClick={() => setPages(pages.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: '1px solid var(--muted)', color: 'var(--muted)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>{t('adminPublicaciones.eliminarPagina')}</button>
                  )}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div className="input-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span>{t('adminPublicaciones.imagenPagina')}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Min: 1280x720 | 16:9</span>
                    </label>
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
                      }} placeholder={t('adminPublicaciones.urlPlaceholder')} />
                    </div>
                  </div>
                </div>
                <div className="input-group">
                  <label>{t('adminPublicaciones.estructuraHtml')}</label>
                  <textarea required value={page.content} onChange={(e) => {
                    const newPages = [...pages];
                    newPages[idx] = { ...newPages[idx], content: e.target.value };
                    setPages(newPages);
                  }} placeholder={`<div style="padding: 40px;">\n  <h1>Página ${idx + 1}</h1>\n</div>`} style={{ minHeight: '300px', resize: 'vertical' }}></textarea>
                </div>
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
