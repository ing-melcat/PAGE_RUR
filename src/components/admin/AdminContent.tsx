import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TriangleAlert, Star, Eye, EyeOff, Upload, X, ChevronDown, ChevronUp, HelpCircle, Clock, RotateCcw, Trash2 } from "lucide-react";
import {
  IconoModoEscribir,
  IconoModoPrevisualizar,
  IconoModoDividido,
  IconoModoZen,
  IconoSalirZen,
  IconoCodigoTecnico,
  IconoMatrizTabla,
  IconoSubirTelemetria,
  IconoProtocoloCallout,
} from "../iconos/IconosEditor";
import MDEditor from '@uiw/react-md-editor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypePrism from 'rehype-prism-plus';
import { apiFetch, apiUpload } from "../../lib/apiClient";
import { comprimirModelo3D } from "../../lib/comprimirModelo3D";
import { markdownSanitizeSchema } from "../../lib/markdownSanitizeSchema";
import { rehypeQuitarTituloDuplicado } from "../../lib/rehypeQuitarTituloDuplicado";
import { componentesMarkdown } from "../../lib/componentesMarkdown";
import { useLanguage } from "../../lib/i18n";
import { Ayuda } from "../Ayuda";
import { puede } from "../../lib/authUtils";
import { useNotificar, useConfirmar } from "../Notificaciones";

import { usePosts, useMutatePost } from "../../hooks/queries/usePosts";
import { usePersonas } from "../../hooks/queries/useUsers";
import { useModelos3D } from "../../hooks/queries/useModelos3D";

const DRAFT_KEY = 'rur_admin_post_draft';

interface PostDraft {
  title: string;
  content: string;
  type: string;
  category: string;
  image: string;
  backgroundImage: string;
  modelUrl: string;
  location: string;
  countdownDate?: string;
  pages: { content: string; image: string }[];
  autores: { userId: number; papel: string; lider: boolean }[];
  timestamp: string;
}

export const AdminContent = ({ onBack, user }: { onBack: () => void, user: any }) => {
  const { t, lang } = useLanguage();
  const notificar = useNotificar();
  const confirmar = useConfirmar();
  const [viewMode, setViewMode] = useState<'list'|'create'|'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAvailable, setDraftAvailable] = useState<PostDraft | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  useLayoutEffect(() => {
    const forzarScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
      }
    };
    forzarScroll();
    const rafId = requestAnimationFrame(forzarScroll);
    const t1 = setTimeout(forzarScroll, 40);
    const t2 = setTimeout(forzarScroll, 120);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [viewMode]);

  const { data: postsList = [], isLoading: postsLoading } = usePosts();
  const { data: personas = [] } = usePersonas(puede(user, 'publicaciones.firmar'));
  const mutatePost = useMutatePost();

  const [type, setType] = useState('simple');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [pages, setPages] = useState([{ content: '', image: '', _key: Math.random().toString() }]);
  const [countdownDate, setCountdownDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('landing');
  const [modelUrl, setModelUrl] = useState('');
  const [autores, setAutores] = useState<{ _key?: string; userId: number; papel: string; lider: boolean }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);
  // Ver LoginApp.tsx (handleRobotModelUpload) para el porqué completo: un
  // modelo grande se comprime en el navegador antes de subirlo, y eso por sí
  // solo tarda -- sin este estado el botón se habría quedado en "SUBIR
  // LOCAL" mientras tanto, como si el clic no hubiera hecho nada.
  const [comprimiendoModel, setComprimiendoModel] = useState(false);
  // 0-1, se reinicia a 0 al empezar cada fase. Una sola barra para comprimir
  // y subir, sin repartir un porcentaje entre las dos: son un trabajo de
  // CPU y uno de red sin relación entre sí.
  const [progresoModelo, setProgresoModelo] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  // Modelos ya subidos en cualquier robot o publicación, para elegir uno en
  // vez de tener que volver a subir el mismo archivo. Ver useModelos3D.
  const { data: modelos3d = [] } = useModelos3D();

  // Ergonomía y edición del editor Markdown
  const [modoEditor, setModoEditor] = useState<'edit' | 'preview' | 'live'>(() => {
    const guardado = typeof window !== 'undefined' ? localStorage.getItem('rur_editor_mode') : null;
    if (guardado === 'edit' || guardado === 'preview' || guardado === 'live') {
      return guardado;
    }
    return 'edit';
  });
  const [modoZen, setModoZen] = useState(false);
  const [menuCalloutsAbierto, setMenuCalloutsAbierto] = useState(false);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const dropdownCalloutsRef = useRef<HTMLDivElement>(null);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const cambiarModoEditor = (nuevoModo: 'edit' | 'preview' | 'live') => {
    setModoEditor(nuevoModo);
    try {
      localStorage.setItem('rur_editor_mode', nuevoModo);
    } catch (err) {
      console.warn('Error al guardar rur_editor_mode:', err);
    }
  };

  useEffect(() => {
    if (!modoZen) return;
    const scrollOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModoZen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = scrollOriginal;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modoZen]);

  useEffect(() => {
    if (!menuCalloutsAbierto) return;
    const handleClickAfuera = (e: MouseEvent) => {
      if (dropdownCalloutsRef.current && !dropdownCalloutsRef.current.contains(e.target as Node)) {
        setMenuCalloutsAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, [menuCalloutsAbierto]);

  const guardarSeleccion = (e: React.SyntheticEvent) => {
    if (e.target instanceof HTMLTextAreaElement) {
      lastSelectionRef.current = {
        start: e.target.selectionStart,
        end: e.target.selectionEnd,
      };
    }
  };

  const insertarEnCursor = (plantilla: string) => {
    if (modoEditor === 'preview') {
      cambiarModoEditor('edit');
    }

    const container = editorContainerRef.current;
    const textarea = container?.querySelector('textarea') as HTMLTextAreaElement | null;

    let start = content.length;
    let end = content.length;

    if (textarea) {
      if (typeof textarea.selectionStart === 'number' && typeof textarea.selectionEnd === 'number') {
        start = textarea.selectionStart;
        end = textarea.selectionEnd;
      } else if (lastSelectionRef.current.start <= content.length) {
        start = lastSelectionRef.current.start;
        end = lastSelectionRef.current.end;
      }
    }

    const before = content.slice(0, start);
    const after = content.slice(end);

    const saltoAntes = before.length === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const saltoDespues = after.length === 0 || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';

    const textoAInsertar = `${saltoAntes}${plantilla}${saltoDespues}`;
    const nuevoContenido = `${before}${textoAInsertar}${after}`;

    setContent(nuevoContenido);

    setTimeout(() => {
      const elTextarea = editorContainerRef.current?.querySelector('textarea') as HTMLTextAreaElement | null;
      if (elTextarea) {
        elTextarea.focus();
        const posFinal = before.length + textoAInsertar.length;
        elTextarea.setSelectionRange(posFinal, posFinal);
        lastSelectionRef.current = { start: posFinal, end: posFinal };
      }
    }, 10);
  };

  const CALLOUTS = [
    {
      tipo: 'NOTE',
      label: 'NOTA TÉCNICA',
      color: '#3A82EE',
      snippet: '> [!NOTE]\n> Registro de especificación técnica o bitácora de telemetría.',
    },
    {
      tipo: 'TIP',
      label: 'CALIBRACIÓN / TIP',
      color: '#10B981',
      snippet: '> [!TIP]\n> Parámetro recomendado de calibración u optimización.',
    },
    {
      tipo: 'IMPORTANT',
      label: 'DIRECTRIZ CRÍTICA',
      color: 'var(--accent)',
      snippet: '> [!IMPORTANT]\n> Requisito indispensable para la operación del sistema.',
    },
    {
      tipo: 'WARNING',
      label: 'PRECAUCIÓN OPERACIONAL',
      color: 'var(--warning)',
      snippet: '> [!WARNING]\n> Procedimiento con riesgo de fallo mecánico o desconexión.',
    },
    {
      tipo: 'CAUTION',
      label: 'PARO DE EMERGENCIA',
      color: 'var(--error)',
      snippet: '> [!CAUTION]\n> Alerta de seguridad crítica. Desactivación o bypass inmediato.',
    },
  ];



  const handleDelete = async (id: string) => {
    if(!(await confirmar(t('alertas.confirmarEliminarPublicacion')))) return;
    try {
      await mutatePost.mutateAsync({ id, method: 'DELETE' });
    } catch(err: any) {
      if (err.message.includes('Error al guardar')) notificar(t('alertas.errorEliminar'), 'error');
      else notificar(t('alertas.sinPermisos'), 'error');
    }
  };

  const toggleVisibility = async (post: any) => {
    try {
      await mutatePost.mutateAsync({
        id: post.id,
        method: 'PUT',
        postData: { isHidden: !post.isHidden }
      });
    } catch(err) { notificar(t('alertas.errorActualizarVisibilidad'), 'error'); }
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
    setBackgroundImage(post.backgroundImage || '');
    setCountdownDate(post.countdownDate || '');
    setLocation(post.location || '');
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
    setBackgroundImage('');
    setCountdownDate('');
    setLocation('');
    setPages([{ content: '', image: '', _key: Math.random().toString() }]);
    setModelUrl('');
    setAutores([]);
    setDraftAvailable(null);
    setLastSavedTime(null);
  };

  const formatearFechaDraft = (isoOrMs?: string) => {
    if (!isoOrMs) return '';
    try {
      const d = new Date(isoOrMs);
      if (isNaN(d.getTime())) return isoOrMs;
      return d.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoOrMs;
    }
  };

  const isFormEmpty = () => {
    return (
      !title.trim() &&
      !content.trim() &&
      !image.trim() &&
      !backgroundImage.trim() &&
      !modelUrl.trim() &&
      !location.trim() &&
      !countdownDate.trim() &&
      pages.every(p => !p.content?.trim() && !p.image?.trim()) &&
      autores.length === 0
    );
  };

  const hayContenidoRelevante = Boolean(
    title.trim() ||
    content.trim() ||
    image.trim() ||
    backgroundImage.trim() ||
    modelUrl.trim() ||
    location.trim() ||
    pages.some(p => (p.content && p.content.trim()) || (p.image && p.image.trim()))
  );

  // Detección de borrador al entrar o montar en modo creación
  useEffect(() => {
    if (viewMode === 'create') {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed: PostDraft = JSON.parse(raw);
          if (isFormEmpty()) {
            setDraftAvailable(parsed);
          }
        }
      } catch (err) {
        console.warn('Error al verificar borrador local:', err);
      }
    } else {
      setDraftAvailable(null);
    }
  }, [viewMode]);

  // Auto-guardado debounced (1.2s tras último cambio) en localStorage
  useEffect(() => {
    if (viewMode !== 'create') return;
    if (draftAvailable) return;
    if (!hayContenidoRelevante) return;

    const timer = setTimeout(() => {
      try {
        const draft: PostDraft = {
          title,
          content,
          type,
          category,
          image,
          backgroundImage,
          modelUrl,
          location,
          countdownDate,
          pages: pages.map(p => ({ content: p.content, image: p.image })),
          autores: autores.map(a => ({ userId: a.userId, papel: a.papel, lider: a.lider })),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setLastSavedTime(`${hh}:${mm}`);
      } catch (err) {
        console.warn('Error al auto-guardar borrador:', err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    viewMode,
    draftAvailable,
    hayContenidoRelevante,
    title,
    content,
    type,
    category,
    image,
    backgroundImage,
    modelUrl,
    location,
    countdownDate,
    pages,
    autores
  ]);

  const restaurarBorrador = () => {
    if (!draftAvailable) return;
    setTitle(draftAvailable.title || '');
    setContent(draftAvailable.content || '');
    setType(draftAvailable.type || 'simple');
    setCategory(draftAvailable.category || 'landing');
    setImage(draftAvailable.image || '');
    setBackgroundImage(draftAvailable.backgroundImage || '');
    setModelUrl(draftAvailable.modelUrl || '');
    setLocation(draftAvailable.location || '');
    setCountdownDate(draftAvailable.countdownDate || '');
    if (draftAvailable.pages && Array.isArray(draftAvailable.pages) && draftAvailable.pages.length > 0) {
      setPages(draftAvailable.pages.map(p => ({
        content: p.content || '',
        image: p.image || '',
        _key: Math.random().toString()
      })));
    } else {
      setPages([{ content: '', image: '', _key: Math.random().toString() }]);
    }
    if (draftAvailable.autores && Array.isArray(draftAvailable.autores)) {
      setAutores(draftAvailable.autores.map(a => ({
        userId: a.userId,
        papel: a.papel || '',
        lider: Boolean(a.lider),
        _key: Math.random().toString()
      })));
    } else {
      setAutores([]);
    }

    if (draftAvailable.timestamp) {
      try {
        const d = new Date(draftAvailable.timestamp);
        if (!isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          setLastSavedTime(`${hh}:${mm}`);
        }
      } catch {}
    }

    setDraftAvailable(null);
    notificar(t('adminPublicaciones.borradorRestaurado', 'Borrador restaurado correctamente.'), 'exito');
  };

  const descartarBorrador = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      console.warn('Error al descartar borrador:', err);
    }
    setDraftAvailable(null);
    setLastSavedTime(null);
    notificar(t('adminPublicaciones.borradorDescartado', 'Borrador descartado.'), 'info');
  };

  const renderSanitizedPreview = (source: string) => (
    <div className="contenido-publicacion" style={{ padding: '16px', color: 'var(--text)', background: 'var(--background)', minHeight: '100%' }}>
      {/* Misma cadena de plugins que la página pública (PublicationPage,
          Landing.tsx) -- incluido el que quita el primer <h1> si repite el
          título, para que quien redacta vea aquí exactamente lo que se va a
          publicar. Los modelos 3D no llevan portada en la página pública, así
          que ahí tampoco se les quita el título. */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema], [rehypePrism, { ignoreMissing: true }], [rehypeQuitarTituloDuplicado, type !== '3d_model' ? title : undefined]]}
        components={componentesMarkdown}
      >
        {source}
      </ReactMarkdown>
    </div>
  );

  const subirArchivoImagen = async (file: File): Promise<string> => {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('La imagen es demasiado grande. El tamaño máximo permitido es 10MB.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const { status, contentType, json: data } = await apiUpload('/api/upload', formData);
    if (status < 200 || status >= 300 || !contentType?.includes('application/json') || !data) {
      throw new Error('Error del servidor: Posiblemente la imagen es demasiado grande o hubo un error de red.');
    }
    if (!data.url) {
      throw new Error(data.message || t('alertas.errorSubirImagen'));
    }
    return data.url;
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (url: string) => void,
    esPortada = false
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (!file.type.startsWith('image/')) {
      notificar('El archivo seleccionado debe ser una imagen.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notificar('La imagen es demasiado grande. El tamaño máximo permitido es 10MB.', 'error');
      e.target.value = '';
      return;
    }

    const isValid = await new Promise<boolean>((resolve) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (esPortada) {
          const aspect = img.width / img.height;
          if (img.width < 1280 || img.height < 720) {
            notificar(`La imagen es muy pequeña (${img.width}x${img.height}). Para que se vea nítida en todas las pantallas, debe medir al menos 1280x720 píxeles.`, 'error');
            resolve(false);
          } else if (Math.abs(aspect - 16/9) > 0.02) {
            notificar(`Para mantener el diseño actual, la imagen debe ser exactamente 16:9 (ej. 1920x1080 o 1280x720). Tu imagen mide ${img.width}x${img.height} píxeles. Por favor expórtala en 16:9 para evitar recortes.`, 'error');
            resolve(false);
          } else {
            resolve(true);
          }
        } else {
          if (img.width < 10 || img.height < 10) {
            notificar(`La imagen es demasiado pequeña (${img.width}x${img.height} px).`, 'error');
            resolve(false);
          } else {
            resolve(true);
          }
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        notificar('El archivo no es una imagen válida o está dañado.', 'error');
        resolve(false);
      };
      img.src = objectUrl;
    });

    if (!isValid) {
      e.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const url = await subirArchivoImagen(file);
      callback(url);
    } catch(err: any) {
      notificar(err.message || t('alertas.errorConexionImagen'), 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const procesarSubidaImagenMarkdown = async (
    file: File,
    insertarMarkdown: (markdownText: string) => void
  ) => {
    if (!file.type.startsWith('image/')) return;

    if (file.size > 10 * 1024 * 1024) {
      notificar('La imagen es demasiado grande. El tamaño máximo permitido es 10MB.', 'error');
      return;
    }

    const esValida = await new Promise<boolean>((resolve) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img.width >= 10 && img.height >= 10);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(false);
      };
      img.src = objectUrl;
    });

    if (!esValida) {
      notificar('La imagen es demasiado pequeña (mínimo 10x10 px) o no es válida.', 'error');
      return;
    }

    setUploadingImage(true);
    notificar('Subiendo imagen...', 'info');
    try {
      const url = await subirArchivoImagen(file);
      insertarMarkdown(`![imagen](${url})`);
      notificar('Imagen insertada correctamente.', 'exito');
    } catch (err: any) {
      notificar(err.message || t('alertas.errorConexionImagen'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const crearManejadorPegar = (
    setter: (fn: (prev: string) => string) => void
  ) => (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();

          let cursorStart: number | null = null;
          let cursorEnd: number | null = null;
          if (e.target instanceof HTMLTextAreaElement) {
            cursorStart = e.target.selectionStart;
            cursorEnd = e.target.selectionEnd;
          }

          procesarSubidaImagenMarkdown(file, (md) => {
            setter((prev) => {
              if (cursorStart !== null && cursorEnd !== null && cursorStart <= prev.length) {
                const before = prev.slice(0, cursorStart);
                const after = prev.slice(cursorEnd);
                const sepBefore = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
                const sepAfter = after.length > 0 && !after.startsWith('\n') ? '\n' : '';
                return `${before}${sepBefore}${md}${sepAfter}${after}`;
              }
              return prev ? `${prev}\n\n${md}\n` : `${md}\n`;
            });
          });
          break;
        }
      }
    }
  };

  const crearManejadorSoltar = (
    setter: (fn: (prev: string) => string) => void,
    setDragState?: (dragging: boolean) => void
  ) => (e: React.DragEvent) => {
    if (setDragState) setDragState(false);
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      e.preventDefault();

      let cursorStart: number | null = null;
      let cursorEnd: number | null = null;
      if (e.target instanceof HTMLTextAreaElement) {
        cursorStart = e.target.selectionStart;
        cursorEnd = e.target.selectionEnd;
      }

      for (const file of imageFiles) {
        procesarSubidaImagenMarkdown(file, (md) => {
          setter((prev) => {
            if (cursorStart !== null && cursorEnd !== null && cursorStart <= prev.length) {
              const before = prev.slice(0, cursorStart);
              const after = prev.slice(cursorEnd);
              const sepBefore = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
              const sepAfter = after.length > 0 && !after.startsWith('\n') ? '\n' : '';
              return `${before}${sepBefore}${md}${sepAfter}${after}`;
            }
            return prev ? `${prev}\n\n${md}\n` : `${md}\n`;
          });
        });
      }
    }
  };

  const handlePasteContent = crearManejadorPegar((fn) => setContent(fn));
  const handleDropContent = crearManejadorSoltar((fn) => setContent(fn), setIsDraggingOver);

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  // Subida del modelo 3D. No reutiliza handleImageUpload a propósito: aquel
  // valida el archivo cargándolo como imagen (mínimo 1280x720 y 16:9), y un
  // .glb cae siempre en img.onerror -- se descartaría en silencio, sin subir
  // nada y sin decir por qué.
  //
  // Un modelo grande se comprime primero en el propio navegador -- mismo
  // motivo que en LoginApp.tsx (handleRobotModelUpload): una subida de
  // cientos de MB tarda tanto que cualquier hipo de la conexión la corta a
  // medio camino, sin manera de reanudarla. Ver lib/comprimirModelo3D.ts. El
  // servicio de contenido sigue comprimiendo también su lado
  // (services/content/server.js: comprimirModelo) -- no está de más como
  // respaldo, y por si algún día algo sube sin pasar por este formulario.
  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    let file = e.target.files[0];

    if (/\.(glb|gltf)$/i.test(file.name)) {
      setComprimiendoModel(true);
      setProgresoModelo(0);
      try {
        const resultado = await comprimirModelo3D(file, setProgresoModelo);
        console.log(
          `[modelo3d] comprimido en el navegador: ${(resultado.originalSize / 1048576).toFixed(1)} MB -> ${(resultado.compressedSize / 1048576).toFixed(1)} MB`
        );
        file = resultado.archivo;
      } catch (err) {
        console.error('[modelo3d] no se pudo comprimir en el navegador:', err);
        if (file.size > 50 * 1024 * 1024) {
            notificar(t('alertas.errorComprimirModelo') + ': El archivo original es demasiado grande.', 'error');
            setComprimiendoModel(false);
            e.target.value = '';
            return;
        } else {
            console.warn('[modelo3d] El archivo ya es pequeño (' + (file.size/1048576).toFixed(1) + ' MB). Subiendo original sin comprimir...');
        }
      }
      setComprimiendoModel(false);
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingModel(true);
    setProgresoModelo(0);
    try {
      // apiUpload y no apiFetch: fetch() no expone progreso de subida de
      // forma consistente en ningún navegador. Ver el comentario en
      // lib/apiClient.ts.
      const { status, contentType, json: data } = await apiUpload('/api/upload', formData, {
        onProgress: setProgresoModelo,
      });
      // Un modelo grande que pasa del límite devuelve el error de multer como
      // HTML, no como JSON: sin esta comprobación, se intentaría leer un
      // mensaje de un objeto que nunca llegó a parsear.
      if (status < 200 || status >= 300 || !contentType?.includes('application/json') || !data) {
        notificar('Error del servidor: el modelo puede superar el límite de 50 MB, o hubo un error de red.', 'error');
        setUploadingModel(false);
        e.target.value = '';
        return;
      }
      if (data.url) setModelUrl(data.url);
      else notificar(data.message || t('alertas.errorSubirModelo'), 'error');
    } catch(err) { notificar(t('alertas.errorConexionModelo'), 'error'); }
    setUploadingModel(false);
    e.target.value = '';
  };

  const isSubmitting = mutatePost.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const postData = {
      title, type, image, category, modelUrl,
      backgroundImage: (type === 'simple' || type === 'aviso' || type === 'evento' || type === '3d_model') ? backgroundImage : undefined,
      content: (type === 'simple' || type === 'aviso' || type === 'evento' || type === '3d_model') ? content : 'Contenido Multi-página',
      pages: type === 'magazine' ? pages.map((p: any) => { const { _key, ...rest } = p; return rest; }) : [],
      countdownDate: (type === 'aviso' || type === 'evento') ? countdownDate : undefined,
      location: location.trim() || undefined,
      autores: puede(user, 'publicaciones.firmar') ? autores.filter(a => a.userId) : undefined,
    };

    try {
      await mutatePost.mutateAsync({
        id: viewMode === 'edit' ? editingId! : undefined,
        method: viewMode === 'edit' ? 'PUT' : 'POST',
        postData
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (err) {
        console.warn('Error al limpiar borrador:', err);
      }
      setLastSavedTime(null);
      setDraftAvailable(null);
      resetForm();
      notificar(viewMode === 'edit' ? t('alertas.publicacionActualizada') : t('alertas.publicacionCreada'), 'exito');
      setViewMode('list');
    } catch(err) {
      notificar(t('alertas.errorConectarServidor'), 'error');
    }
  };

  if (viewMode === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '60vh' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h2 className="titulo-panel">{t('adminPublicaciones.titulo')}</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '32px' }}>
          {/* Tarjeta de Crear Nueva */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => { resetForm(); setViewMode('create'); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resetForm(); setViewMode('create'); } }}
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
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '20px' }}>
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

        <div style={{ marginTop: 'auto', paddingTop: '32px', display: 'flex', justifyContent: 'flex-start' }}>
          <button className="back-link" onClick={onBack}>{t('adminPublicaciones.volverMenu')}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: '80vh' }}>
      <AnimatePresence>
        {viewMode === 'create' && draftAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--accent)',
              borderLeft: '4px solid var(--accent)',
              borderRadius: '6px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              fontFamily: 'var(--font-ibm-mono)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                {t('adminPublicaciones.borradorDetectado', 'Tienes un borrador sin guardar del')}{' '}
                <strong style={{ color: 'var(--accent)' }}>
                  {formatearFechaDraft(draftAvailable.timestamp)}
                </strong>
                .
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={restaurarBorrador}
                style={{
                  background: 'var(--accent)',
                  color: 'var(--background)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-ibm-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                <RotateCcw size={14} />
                {t('adminPublicaciones.restaurarBorrador', 'Restaurar borrador')}
              </button>

              <button
                type="button"
                onClick={descartarBorrador}
                style={{
                  background: 'transparent',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-ibm-mono)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--muted)';
                  e.currentTarget.style.color = 'var(--text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--muted)';
                }}
              >
                <Trash2 size={14} />
                {t('adminPublicaciones.descartarBorrador', 'Descartar')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '32px', flex: 1 }}>
        {/* Sidebar de Configuración */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h2 className="titulo-panel titulo-panel--acento" style={{ margin: 0 }}>{viewMode === 'edit' ? t('adminPublicaciones.editar') : t('adminPublicaciones.crear')}</h2>
            {lastSavedTime && viewMode === 'create' && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'var(--font-ibm-mono)',
                fontSize: '0.75rem',
                color: 'var(--muted)',
                background: 'var(--surface-strong)',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border)'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                <span>{t('adminPublicaciones.guardadoLocal', 'Guardado local:')} {lastSavedTime}</span>
              </div>
            )}
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

        {(type === 'evento' || type === 'aviso' || type === 'simple') && (
          <div className="input-group">
            <label>Ubicación (Opcional)</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej. Laboratorio de Robótica" />
          </div>
        )}

        <div className="input-group">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>{t('adminPublicaciones.portada')}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 'normal' }}>Min: 1280x720 | 16:9</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setImage, true)} style={{ display: 'none' }} id="upload-cover" />
            <label htmlFor="upload-cover" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: 'var(--surface-strong)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>
              {uploadingImage ? t('adminPublicaciones.subiendo') : <><Upload size={14} /> {t('adminPublicaciones.subirLocal')}</>}
            </label>
          </div>
          <input type="text" value={image} onChange={(e) => setImage(e.target.value)} placeholder={t('adminPublicaciones.urlPlaceholder')} />
        </div>

        {(type === 'simple' || type === 'aviso' || type === 'evento' || type === '3d_model') && (
          <div className="input-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              {/* Se llamaba "Fondo de Lectura" porque esta imagen era el papel
                  tapiz de todo el texto. Ya no: ahora es la cabecera grande de
                  la publicación (.portada-publicacion, index.css), un tramo de
                  62vh -- máximo 620px -- con el título anclado abajo. */}
              <span>Imagen de Cabecera (Opcional)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 'normal' }}>Rec: 2560x1440 | 16:9</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBackgroundImage)} style={{ display: 'none' }} id="upload-bg" />
              <label htmlFor="upload-bg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: 'var(--surface-strong)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>
                {uploadingImage ? t('adminPublicaciones.subiendo') : <><Upload size={14} /> {t('adminPublicaciones.subirLocal')}</>}
              </label>
            </div>
            <input type="text" value={backgroundImage} onChange={(e) => setBackgroundImage(e.target.value)} placeholder="Sin imagen, la cabecera sale compacta" />
          </div>
        )}

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

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lastSavedTime && viewMode === 'create' && (
            <div style={{
              textAlign: 'center',
              fontFamily: 'var(--font-ibm-mono)',
              fontSize: '0.72rem',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              <span>{t('adminPublicaciones.guardadoLocal', 'Guardado local:')} {lastSavedTime}</span>
            </div>
          )}
          <button onClick={handleSubmit} disabled={isSubmitting} className="action-card" style={{ width: '100%' }}>
            {isSubmitting ? t('adminPublicaciones.guardando') : (viewMode === 'edit' ? t('adminPublicaciones.guardarCambios') : t('adminPublicaciones.publicarAhora'))}
          </button>
          <button className="back-link" onClick={() => { resetForm(); setViewMode('list'); }} style={{ margin: 0, width: '100%' }}>
            {t('adminPublicaciones.cancelarVolver')}
          </button>
        </div>
      </div>

      {/* Editor Principal */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '32px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
        <div>
          <h2 className="titulo-panel titulo-panel--acento">{t('adminPublicaciones.contenidoHtml')}</h2>
        </div>



        {type === '3d_model' && (
          <div className="input-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>{t('adminPublicaciones.rutaModelo3d')}</span>
              <span style={{ fontSize: 'var(--t-xs)', color: 'var(--muted)', fontWeight: 'normal' }}>.glb o .gltf · se comprime al subir</span>
            </label>
            {modelos3d.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) setModelUrl(e.target.value);
                  // Acción rápida, no un dato guardado -- vuelve al
                  // placeholder tras elegir; el valor real vive en el
                  // <input> de más abajo.
                  e.target.value = '';
                }}
                style={{ marginBottom: '8px' }}
              >
                <option value="">{t('adminPublicaciones.elegirModeloExistente')}</option>
                {modelos3d.map((m) => (
                  <option key={m.url} value={m.url}>
                    {m.etiqueta} — {m.origen === 'robot' ? t('modelos3d.origenRobot') : t('modelos3d.origenPublicacion')}
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {/* Solo extensiones, sin tipos MIME: model/gltf-binary y
                  model/gltf+json no los reconocen todos los diálogos de
                  archivo, y cuando no los reconocen filtran de más — el .glb
                  aparece en gris y no hay forma de elegirlo. Es también lo
                  que hace el selector de modelo del editor de robots. */}
              <input type="file" accept=".glb,.gltf" onChange={handleModelUpload} style={{ display: 'none' }} id="upload-model" />
              <label htmlFor="upload-model" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: 'var(--surface-strong)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: 'var(--t-xs)' }}>
                {comprimiendoModel ? t('adminPublicaciones.comprimiendoModelo') : uploadingModel ? t('adminPublicaciones.subiendo') : <><Upload size={14} /> {t('adminPublicaciones.subirLocal')}</>}
              </label>
            </div>
            {/* Mismo marco que cualquier <input> del panel (fondo --background,
                borde --border, radio 2px): es una barra de progreso, no una
                tarjeta nueva. */}
            {(comprimiendoModel || uploadingModel) && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ height: '4px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.round(progresoModelo * 100)}%`,
                    background: 'var(--accent)',
                    transition: 'width 0.15s linear',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  <span>{comprimiendoModel ? t('adminPublicaciones.comprimiendoModelo') : t('adminPublicaciones.subiendo')}</span>
                  <span>{Math.round(progresoModelo * 100)}%</span>
                </div>
              </div>
            )}
            <input type="text" value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} placeholder="Ej. /models/BMO.glb" />
          </div>
        )}

        {(type === 'simple' || type === 'aviso' || type === 'evento' || type === '3d_model') ? (
            <div 
              ref={editorContainerRef}
              style={modoZen ? {
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'var(--background)',
                padding: '24px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: isDraggingOver ? '2px dashed var(--accent)' : 'none',
              } : {
                flex: 1, 
                minHeight: '600px', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative',
                border: isDraggingOver ? '2px dashed var(--accent)' : '2px solid transparent',
                borderRadius: '8px',
                transition: 'border-color 0.2s ease',
              }} 
              data-color-mode="dark"
              onPaste={handlePasteContent}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                setIsDraggingOver(false);
                handleDropContent(e);
              }}
              onSelectCapture={guardarSeleccion}
              onKeyUpCapture={guardarSeleccion}
              onMouseUpCapture={guardarSeleccion}
            >
              {isDraggingOver && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(3px)',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  borderRadius: '6px',
                  pointerEvents: 'none',
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-ibm-mono)',
                  border: '2px dashed var(--accent)',
                }}>
                  <Upload size={40} />
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                    Suelta la imagen aquí para insertarla en el contenido
                  </span>
                </div>
              )}

              {uploadingImage && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'var(--surface)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-ibm-mono)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 60,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    border: '2px solid var(--accent)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Subiendo imagen...
                </div>
              )}

              {/* Barra superior de ergonomía y edición */}
              <div className="editor-toolbar-superior">
                {/* Grupo Izquierdo: Pestañas de modo + Atajos técnicos */}
                <div className="editor-toolbar-grupo">
                  {/* Selector de Pestañas: Escribir / Vista Previa / Dividido */}
                  <div className="editor-modo-selector" role="tablist" aria-label="Modo de visualización">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={modoEditor === 'edit'}
                      className={`editor-modo-tab ${modoEditor === 'edit' ? 'activo' : ''}`}
                      onClick={() => cambiarModoEditor('edit')}
                      title="100% ancho para escribir cómodamente, sin columnas partidas ni lag"
                    >
                      <IconoModoEscribir size={13} />
                      <span>{t('adminPublicaciones.modoEscribir', 'ESCRIBIR')}</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={modoEditor === 'preview'}
                      className={`editor-modo-tab ${modoEditor === 'preview' ? 'activo' : ''}`}
                      onClick={() => cambiarModoEditor('preview')}
                      title="100% ancho mostrando el visor real con callouts y estilos"
                    >
                      <IconoModoPrevisualizar size={13} />
                      <span>{t('adminPublicaciones.modoVistaPrevia', 'VISOR FINAL')}</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={modoEditor === 'live'}
                      className={`editor-modo-tab ${modoEditor === 'live' ? 'activo' : ''}`}
                      onClick={() => cambiarModoEditor('live')}
                      title="Pantalla dividida tradicional para monitores muy anchos"
                    >
                      <IconoModoDividido size={13} />
                      <span>{t('adminPublicaciones.modoDividido', 'PANEL DUAL')}</span>
                    </button>
                  </div>

                  {modoEditor !== 'preview' && (
                    <>
                      <div className="editor-separador" />

                      {/* Atajos de documentación técnica */}
                      {/* Desplegable de Callouts / Protocolos */}
                      <div style={{ position: 'relative' }} ref={dropdownCalloutsRef}>
                        <button
                          type="button"
                          className={`editor-btn-herramienta ${menuCalloutsAbierto ? 'activo' : ''}`}
                          onClick={() => setMenuCalloutsAbierto(!menuCalloutsAbierto)}
                          title="Insertar bloques de protocolo, advertencia o calibración técnica"
                          aria-expanded={menuCalloutsAbierto}
                        >
                          <IconoProtocoloCallout size={13} style={{ color: 'var(--accent)' }} />
                          <span>PROTOCOLOS</span>
                          <ChevronDown
                            size={11}
                            style={{
                              transform: menuCalloutsAbierto ? 'rotate(180deg)' : 'none',
                              transition: 'transform var(--mov-rapido) ease',
                            }}
                          />
                        </button>

                        {menuCalloutsAbierto && (
                          <div className="editor-callout-menu">
                            {CALLOUTS.map((c) => (
                              <button
                                key={c.tipo}
                                type="button"
                                className="editor-callout-item"
                                onClick={() => {
                                  insertarEnCursor(c.snippet);
                                  setMenuCalloutsAbierto(false);
                                }}
                              >
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '1px',
                                    background: c.color,
                                    flexShrink: 0,
                                  }}
                                />
                                <strong style={{ color: c.color, letterSpacing: '0.04em' }}>[!{c.tipo}]</strong>
                                <span style={{ color: 'var(--muted)', fontSize: '0.7rem', marginLeft: 'auto', letterSpacing: '0.04em' }}>
                                  {c.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Botón Código / Script */}
                      <button
                        type="button"
                        className="editor-btn-herramienta"
                        onClick={() => insertarEnCursor('```typescript\n// Script o instrucción técnica\n```')}
                        title="Insertar bloque de código resaltado"
                      >
                        <IconoCodigoTecnico size={13} />
                        <span>SCRIPT</span>
                      </button>

                      {/* Botón Tabla / Matriz */}
                      <button
                        type="button"
                        className="editor-btn-herramienta"
                        onClick={() =>
                          insertarEnCursor(
                            '| Módulo | Protocolo | Frecuencia | Estado |\n| :--- | :--- | :---: | :--- |\n| TELEM-01 | CAN Bus | 20 Hz | ACTIVO |\n| SENSOR-V2 | WebRTC | 60 fps | CALIBRADO |'
                          )
                        }
                        title="Insertar matriz de telemetría / tabla Markdown"
                      >
                        <IconoMatrizTabla size={13} />
                        <span>MATRIZ</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Grupo Derecho: Subir Imagen, Modo Zen y Badge Zen */}
                <div className="editor-toolbar-grupo">
                  {modoZen && (
                    <span className="editor-zen-badge">
                      ENFOQUE ACTIVO · ESC
                    </span>
                  )}

                  {modoEditor !== 'preview' && (
                    <label
                      className="editor-btn-herramienta"
                      style={{ cursor: 'pointer' }}
                      title="Subir archivo de telemetría o imagen técnica (también puedes arrastrarla o pegarla con Ctrl+V)."
                    >
                      <IconoSubirTelemetria size={13} />
                      <span>{t('adminPublicaciones.insertarImagen') || 'SUBIR IMAGEN'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) =>
                          handleImageUpload(e, (url) =>
                            insertarEnCursor(`![imagen](${url})`)
                          )
                        }
                      />
                    </label>
                  )}

                  {/* Botón Modo Enfoque / Pantalla Zen */}
                  <button
                    type="button"
                    className={`editor-btn-zen ${modoZen ? 'activo' : ''}`}
                    onClick={() => setModoZen(!modoZen)}
                    title={modoZen ? "Restaurar vista estándar (Escape)" : "Modo enfoque a pantalla completa"}
                  >
                    {modoZen ? (
                      <>
                        <IconoSalirZen size={13} style={{ color: 'var(--accent)' }} />
                        <span>SALIR (ESC)</span>
                      </>
                    ) : (
                      <>
                        <IconoModoZen size={13} />
                        <span>PANTALLA COMPLETA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <MDEditor
                value={content}
                onChange={(val) => setContent(val || '')}
                height={modoZen ? 'calc(100vh - 140px)' : 600}
                preview={modoEditor}
                extraCommands={[]}
                components={{ preview: renderSanitizedPreview }}
              />
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 'normal' }}>Min: 1280x720 | 16:9</span>
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
                <div 
                  className="input-group" 
                  data-color-mode="dark"
                  onPaste={crearManejadorPegar((fn) => {
                    setPages(current => {
                      const copy = [...current];
                      copy[idx] = { ...copy[idx], content: fn(copy[idx].content || '') };
                      return copy;
                    });
                  })}
                  onDragOver={(e) => {
                    if (e.dataTransfer?.types?.includes('Files')) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                    }
                  }}
                  onDrop={crearManejadorSoltar((fn) => {
                    setPages(current => {
                      const copy = [...current];
                      copy[idx] = { ...copy[idx], content: fn(copy[idx].content || '') };
                      return copy;
                    });
                  })}
                >
                  <label>{t('adminPublicaciones.estructuraHtml')}</label>
                  <MDEditor
                    value={page.content}
                    onChange={(val) => {
                      const newPages = [...pages];
                      newPages[idx] = { ...newPages[idx], content: val || '' };
                      setPages(newPages);
                    }}
                    height={300}
                    preview={modoEditor}
                    extraCommands={[]}
                    components={{ preview: renderSanitizedPreview }}
                  />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setPages([...pages, { content: '', image: '', _key: Math.random().toString() }])} style={{ padding: '16px', background: 'transparent', color: 'var(--accent)', border: '1px dashed var(--accent)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '1rem', width: '100%' }}>
              {t('adminPublicaciones.anadirPagina')}
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
