import React, { useState, useEffect, useLayoutEffect, useRef, Suspense, lazy } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Loader2, CheckCircle, ChevronDown, ChevronUp, Globe, Lock, Upload, TriangleAlert, Star, Eye, EyeOff, Languages, X } from "lucide-react";
import { CambiarPassword } from "./components/CambiarPassword";
import { NotificacionesProvider, useNotificar, useConfirmar, useMostrarValor } from "./components/Notificaciones";
import { copiarAlPortapapeles } from "./lib/clipboard";
import { PanelMedallas } from "./components/PanelMedallas";
import "./index.css";
import { ModeSelect } from "./controller/ModeSelect";
// Carga diferida: arrastra Robot3DPreview -> @react-three/fiber/drei ->
// three.js entero. Sin esto, cualquiera que solo entra a /login (incluso a
// escribir su matrícula, o sin rol de operador) ya pagaba la descarga
// completa de three.js en el bundle de LoginApp -- mismo patrón que
// ControllerApp más abajo.
const RobotSelection = lazy(() => import("./controller/RobotSelection").then((m) => ({ default: m.RobotSelection as React.ComponentType<any> })));
const PanelTransmision = lazy(() => import("./controller/PanelTransmision").then((m) => ({ default: m.PanelTransmision as React.ComponentType<any> })));
import { apiFetch, apiUpload } from "./lib/apiClient";
import { useLanguage } from "./lib/i18n";
import { Ayuda } from "./components/Ayuda";
import { PanelRoles } from "./components/PanelRoles";
import { pageMotionVariants, pageMotionTransition } from "./lib/motionTokens";

const ControllerApp = lazy(() => import("./controller/ControllerApp"));

import { AdminContent } from "./components/admin/AdminContent";
import { AdminUsers } from "./components/admin/AdminUsers";
import { AdminLogs } from "./components/admin/AdminLogs";
import { ProfileEditor } from "./components/profile/ProfileEditor";
import { Configurar2FA } from "./components/profile/Configurar2FA";
import { useLogs, useMetrics } from "./hooks/queries/useLogs";
import { useModelos3D } from "./hooks/queries/useModelos3D";
import { DashboardSidebar } from "./components/dashboard/DashboardSidebar";
import { DashboardMain } from "./components/dashboard/DashboardMain";
import { getRoles, puede, hasRole, AREAS } from "./lib/authUtils";
import { comprimirModelo3D } from "./lib/comprimirModelo3D";


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


export default function App() {
  const { lang, setLang, t } = useLanguage();
  const notificar = useNotificar();
  const confirmar = useConfirmar();
  const mostrarValor = useMostrarValor();

  // Nada de estado en el navegador, tampoco el de navegación: al recargar se
  // arranca en login y /api/me decide a dónde se va, según la sesión real.
  const [view, setView] = useState(() => sessionStorage.getItem('loginApp_view') || "login");
  useEffect(() => { sessionStorage.setItem('loginApp_view', view); }, [view]);
  const [controlMode, setControlMode] = useState(() => sessionStorage.getItem('loginApp_controlMode') || "manual");
  useEffect(() => { sessionStorage.setItem('loginApp_controlMode', controlMode); }, [controlMode]);
  const [user, setUser] = useState<any>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // enabled: !!user -- sin esto, las tres peticiones de abajo salían disparadas
  // ya desde la pantalla de login, antes de que hubiera sesión que las
  // autorizara: puro ruido de 403 en la consola, en cada carga de la página.
  const { data: logsList = [] } = useLogs({ refetchInterval: view === 'admin_logs' ? 10000 : undefined, enabled: !!user });
  const { data: crowdsecMetrics = null } = useMetrics({ refetchInterval: view === 'admin_logs' ? 10000 : undefined, enabled: !!user });

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
          setView(v => v === "login" ? "dashboard" : v);
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
  const [mainContext, setMainContext] = useState(() => sessionStorage.getItem('loginApp_mainContext') || "modules");
  useEffect(() => { sessionStorage.setItem('loginApp_mainContext', mainContext); }, [mainContext]);

  // Al cambiar de pantalla o contexto interno en LoginApp, restablece el scroll a arriba
  // de inmediato para que la nueva pantalla no cargue desplazada.
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
  }, [view, mainContext]);
  const [activeModule, setActiveModule] = useState<any>(null);

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
  const [livekitToken, setLivekitToken] = useState<any>(() => {
    try {
      const stored = sessionStorage.getItem('loginApp_livekitToken');
      return stored ? JSON.parse(stored) : "";
    } catch {
      return "";
    }
  });
  useEffect(() => { 
    if (livekitToken) {
      sessionStorage.setItem('loginApp_livekitToken', JSON.stringify(livekitToken)); 
    } else {
      sessionStorage.removeItem('loginApp_livekitToken');
    }
  }, [livekitToken]);
  // Pestaña del panel de personal: las personas y los roles se administran
  // en el mismo sitio porque es donde los roles se asignan.
  const [pestanaPersonal, setPestanaPersonal] = useState<'personas'|'roles'|'medallas'>('personas');
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
  const [medallasEspeciales, setMedallasEspeciales] = useState<any[]>([]);

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
  // Aparte de "subiendo": comprimir un modelo grande en el navegador tarda
  // varios segundos por sí solo, antes de que exista nada que subir. Sin un
  // estado propio, el botón se habría quedado en "SUBIR" ese rato, como si
  // no hubiera pasado nada al hacer clic.
  const [comprimiendoRobotModel, setComprimiendoRobotModel] = useState(false);
  // 0-1. Una sola barra para las dos fases (comprimir y subir): se reinicia
  // a 0 al empezar cada una, en vez de intentar repartir un porcentaje único
  // entre un trabajo de CPU y uno de red que no tienen relación entre sí --
  // sumarlos habría dado un número que parece preciso y no lo es.
  const [progresoModelo, setProgresoModelo] = useState(0);
  const robotModelInputRef = useRef<HTMLInputElement>(null);
  // Modelos ya subidos en cualquier robot o publicación, para elegir uno en
  // vez de tener que volver a subir el mismo archivo. Ver useModelos3D.
  const { data: modelos3d = [] } = useModelos3D({ enabled: !!user });

  // El commit original ponía este handler dentro de AdminContent, un
  // componente distinto que no comparte closure con App -- robotModelInputRef
  // y editingRobot viven aquí. Referenciarlo desde el JSX del formulario de
  // robots (dentro de App) habría sido un ReferenceError en tiempo de
  // ejecución la primera vez que alguien le diera clic al botón, algo que
  // tsc no detecta porque este archivo no corre con chequeo de tipos en el
  // build (vite build no valida tipos por defecto).
  const handleRobotModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    let file = e.target.files[0];

    // Un modelo real de cientos de MB tarda tanto en subir que cualquier
    // hipo de la conexión corta la petición a medio camino -- por eso se
    // comprime aquí, en el navegador, ANTES de intentar subirlo: lo que sale
    // ya son decenas de MB, no cientos, y una subida así de corta rara vez
    // se corta. Mismo pipeline que services/content/server.js, ver
    // lib/comprimirModelo3D.ts para el porqué completo.
    if (/\.(glb|gltf)$/i.test(file.name)) {
      setComprimiendoRobotModel(true);
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
            setComprimiendoRobotModel(false);
            e.target.value = '';
            return;
        } else {
            console.warn('[modelo3d] El archivo ya es pequeño (' + (file.size/1048576).toFixed(1) + ' MB). Subiendo original sin comprimir...');
            // No hacemos return, permitimos que el código siga y suba 'file' (el original)
        }
      }
      setComprimiendoRobotModel(false);
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingRobotModel(true);
    setProgresoModelo(0);
    try {
      // apiUpload y no apiFetch: fetch() no expone progreso de subida en
      // ningún navegador de forma consistente. Ver el comentario en
      // lib/apiClient.ts -- CSRF y cookie de sesión se manejan igual, solo
      // que por dentro de XMLHttpRequest en vez de fetch.
      const { status, contentType, json: data } = await apiUpload('/api/upload', formData, {
        onProgress: setProgresoModelo,
      });
      if (status < 200 || status >= 300 || !contentType?.includes('application/json') || !data) {
         notificar(data?.message || ('Error del servidor (' + status + '). Intenta de nuevo.'), 'error');
         setUploadingRobotModel(false);
         e.target.value = '';
         return;
      }
      if (data.url && robotModelInputRef.current) {
        robotModelInputRef.current.value = data.url;
      } else if (!data.url) {
        notificar(t('alertas.errorSubirModelo'), 'error');
      }
    } catch(err) { notificar(t('alertas.errorConexionModelo'), 'error'); }
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
  // Los textos de la ficha pública. Controlados también: el aviso de "ficha
  // vacía" tiene que apagarse en cuanto se escribe el rol, no al guardar.
  const [fichaEdit, setFichaEdit] = useState({ rol_publico: '', area: '', generacion: '' });

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || data);
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
    if (rolesArr.length === 0 && !(await confirmar(t('adminUsuarios.sinRolConfirmar')))) return;
    const permisosExtra = formData.getAll('permisos_extra') as string[];
    const userData = {
      matricula: formData.get('matricula'),
      password: formData.get('user_password_provisional'),
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
        notificar(d.message, 'error');
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
    if (rolesArr.length === 0 && !(await confirmar(t('adminUsuarios.sinRolConfirmar')))) return;
    const permisosExtra = formData.getAll('permisos_extra') as string[];
    const userData = {
      password: formData.get('user_password_provisional'),
      nombre: formData.get('nombre'),
      roles: rolesArr,
      permisos_extra: permisosExtra,
      alias: formData.get('alias'),
      perfil_publico: perfilPublicoEdit,
      ...fichaEdit
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
        notificar(d.message, 'error');
      }
    } catch(e) {
      notificar(t('alertas.errorConexionGenerico'), 'error');
    }
  };

  // Reiniciar la contraseña de otra persona. La genera el servidor y se
  // enseña UNA vez, aquí, para dictarla: no se guarda en claro en ninguna
  // parte, así que si se cierra este aviso sin copiarla hay que generar otra.
  const reiniciarPassword = async (u: any) => {
    const isSelf = u.matricula === user?.matricula;
    const warningMsg = isSelf 
      ? t('adminUsuarios.reiniciarConfirmarPropio') || '¡CUIDADO! Vas a restablecer TU PROPIA contraseña. Te quedarás sin permisos hasta que inicies sesión con la nueva contraseña temporal y la cambies. ¿Estás seguro?'
      : t('adminUsuarios.reiniciarConfirmar').replace('{quien}', u.nombre);

    if (!(await confirmar(warningMsg))) return;
    try {
      const res = await apiFetch(`/api/users/${u.matricula}/password-temporal`, { method: 'POST' });
      const datos = await res.json().catch(() => null);
      if (!res.ok || !datos?.success) return notificar(datos?.message || t('adminUsuarios.reiniciarError'), 'error');
      await mostrarValor(t('adminUsuarios.reiniciarListo').replace('{quien}', u.nombre), datos.password);
    } catch {
      notificar(t('alertas.errorConexionGenerico'), 'error');
    }
  };

  const handleDeleteUser = async (matricula: string) => {
    if (!(await confirmar(t('adminUsuarios.confirmarEliminar')))) return;
    try {
      const res = await apiFetch(`/api/users/${matricula}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
      else {
        const d = await res.json();
        notificar(d.message, 'error');
      }
    } catch(e) {}
  };

  const handleSaveRobot = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedRobot: any = {
        id: formData.get('id'),
        name: formData.get('name'),
        room: formData.get('room'),
        status: formData.get('status'),
        locomotionType: formData.get('locomotionType') || 'tank',
        modelUrl: formData.get('modelUrl') || "",
        livekitUrl: formData.get('livekitUrl') || "",
        livekitApiKey: formData.get('livekitApiKey') || "",
        livekitApiSecret: formData.get('livekitApiSecret') || "",
        // Un checkbox desmarcado no aparece en el FormData: ausente = privado.
        isPublicEvent: formData.get('isPublicEvent') === 'on',
    };

    // El secreto real nunca vuelve al cliente (solo su versión enmascarada,
    // como placeholder) -- dejar el campo en blanco al editar solo puede
    // significar "no lo toques", nunca "bórralo". Si se manda igual como ''
    // el backend lo interpreta como un borrado explícito. En un robot nuevo
    // sí es válido que quede sin secreto.
    if (!editingRobot.isNew && !updatedRobot.livekitApiSecret) {
      delete updatedRobot.livekitApiSecret;
    }

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
          if (!(await confirmar(`${t('alertas.advertenciaLivekitEstado')} ${pingRes.status}. ${t('alertas.advertenciaGuardarTodosModos')}`))) return;
        }
      } catch (err) {
        if (!(await confirmar(t('alertas.advertenciaLivekitPing')))) {
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
        notificar(d.message || t('alertas.errorGuardarRobot'), 'error');
      }
    } catch(e) {
      notificar(t('alertas.errorConexionGenerico'), 'error');
    }
  };

  // El enlace que se le pasa al público durante un evento. No requiere sesión,
  // por eso solo tiene sentido copiarlo si el robot está marcado como público.
  const copiarEnlacePublico = async (robotId: string) => {
    const enlace = `${window.location.origin}/espectador/${robotId}`;
    if (await copiarAlPortapapeles(enlace)) {
      notificar(`${t('alertas.enlaceCopiado')} ${enlace}`, 'exito');
    } else {
      // Sin contexto seguro (HTTP) el copiado automático puede fallar del
      // todo -- se deja el enlace a la vista para copiarlo a mano.
      await mostrarValor(t('alertas.copiarEnlacePrompt'), enlace);
    }
  };

  const handleDeleteRobot = async (id: string) => {
    if (!(await confirmar(t('alertas.confirmarEliminarRobot')))) return;
    try {
      const res = await apiFetch(`/api/robots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRobots();
      } else {
        const d = await res.json();
        notificar(d.message, 'error');
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
      // Solo las otorgables: las automáticas no se conceden, se cumplen.
      .then((d) => { if (d) setMedallasEspeciales((d.medallas ?? []).filter((m: any) => !m.automatica)); })
      .catch(() => {});
  }, [view, pestanaPersonal]);

  // Se aplica al instante, sin esperar a "Actualizar usuario": una medalla no
  // es un campo del formulario, es un acto con fecha y firma. Mezclarla con el
  // guardado haría que cambiar un apellido y conceder un reconocimiento fueran
  // el mismo clic.
  // Con una contraseña provisional no se va a ninguna otra parte. Se desvía
  // aquí en vez de esconder botones uno a uno: `view` es un solo estado, así
  // que ponerlo en esta pantalla apaga todas las demás de golpe. Lo que de
  // verdad lo impide sigue estando en el servidor.
  useEffect(() => {
    if (user?.debe_cambiar_password && view !== 'login' && view !== 'cambiar_password') {
      setView('cambiar_password');
    }
  }, [user, view]);

  const otorgarMedalla = async (clave: string, otorgar: boolean) => {
    if (!editingUser?.id) return;
    const motivo = motivosMedallas[clave] ?? '';
    const res = await apiFetch(`/api/miembros/${editingUser.id}/medallas/${clave}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otorgar, motivo }),
    });
    const datos = await res.json().catch(() => null);
    if (!res.ok) return notificar(datos?.message || t('adminUsuarios.medallaError'), 'error');
    notificar(otorgar ? t('adminUsuarios.medallaHecha') : t('adminUsuarios.medallaRetirada'), 'exito');
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
    variants: pageMotionVariants,
    initial: "initial",
    animate: "animate",
    exit: "exit",
    transition: pageMotionTransition,
    onAnimationStart: () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
      }
    }
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

      <main className={view === "controles" ? "controller-main" : "full-container"} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {/* `sessionChecked` y no solo `view`: la vista arranca en "login"
              porque no hay nada en el navegador que diga lo contrario, y quien
              decide es /api/me. Hasta que contesta pasan unos milisegundos, y
              sin esta condición quien ya tenía sesión veía parpadear el
              formulario de acceso antes de entrar a su panel: parece que te ha
              echado y que vuelve a entrar solo. */}
          {view === "login" && sessionChecked && (
            <motion.section key="login" className="container login-panel" {...pageTransition}>
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

          {/* Contraseña provisional: no hay más pantalla que esta.
              El servidor ya niega el resto de rutas con esa sesión (la marca
              `tmp` del token); esto es para que se encuentre la explicación y
              el formulario, en vez de un panel lleno de errores. */}
          {view === "cambiar_password" && user && (
            <div className="dashboard-card" style={{ maxWidth: '600px', margin: '40px auto' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 className="titulo-panel">¡Bienvenido! Último paso</h2>
                <p style={{ color: 'var(--muted)' }}>Para completar tu registro, es obligatorio vincular tu cuenta con Google Authenticator.</p>
              </div>
              <Configurar2FA 
                user={user} 
                setUser={(u: any) => { 
                  setUser(u); 
                  setView("dashboard"); 
                  setMainContext("modules"); 
                }} 
              />
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button className="back-link" onClick={handleLogout}>Cerrar Sesión (Volver al Login)</button>
              </div>
            </div>
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
                  {user?.nombre}
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
              <DashboardSidebar user={user} openProfileEditor={openProfileEditor} setMainContext={setMainContext} />

              <main className="main-content" style={{ position: 'relative' }}>
                <AnimatePresence mode="wait">
                  {mainContext === "modules" && (
                      <DashboardMain user={user} setView={setView} />
                  )}

                  {mainContext === "edit_profile" && (
                      <ProfileEditor user={user} setUser={setUser} setMainContext={setMainContext} profileForm={profileForm} setProfileForm={setProfileForm} showAlias={showAlias} setShowAlias={setShowAlias} pushNotifications={pushNotifications} setPushNotifications={setPushNotifications} reduceAnimations={reduceAnimations} setReduceAnimations={setReduceAnimations} />
                  )}

                  {mainContext === "cambiar_password" && (
                    <motion.div key="cambiar_password" variants={pageMotionVariants} initial="initial" animate="animate" exit="exit" transition={pageMotionTransition}>
                      <CambiarPassword
                        alTerminar={(u) => { setUser(u); notificar(t('password.listo'), 'exito'); setMainContext("modules"); }}
                        alCancelar={() => setMainContext("modules")}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </motion.section>
          )}
          {view === "transmision" && user && puede(user, "transmision.gestionar") && (
            <motion.section key="transmision" className="full-container" style={{ maxWidth: '1440px', margin: '40px auto', padding: '0 40px', width: '100%', display: 'flex', flexDirection: 'column' }} {...pageTransition}>
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
          {view === "robot_selection" && user && puede(user, "robots.operar") && (
            <motion.section key="robot_selection" className="full-container" style={{ maxWidth: '1440px', margin: '40px auto', padding: '0 40px', width: '100%', display: 'flex', flexDirection: 'column' }} {...pageTransition}>
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
                  controlMappings={user?.control_mappings}
                  onUpdateMappings={async (newMappings) => {
                    try {
                      const res = await apiFetch('/api/profile/mappings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ control_mappings: newMappings })
                      });
                      if (res.ok) {
                        setUser({ ...user, control_mappings: newMappings });
                        notificar(t('alertas.controlesGuardados'), 'exito');
                      } else {
                        notificar(t('alertas.errorGuardarControles'), 'error');
                      }
                    } catch (e) {
                      notificar(t('perfil.errorConexion'), 'error');
                    }
                  }}
                />
              </Suspense>
            </motion.section>
          )}

          {view === "modo_control" && user && puede(user, "robots.operar") && (
            <motion.section key="modo_control" className="full-container" style={{ maxWidth: '1440px', margin: '40px auto', padding: '0 40px', width: '100%', display: 'flex', flexDirection: 'column' }} {...pageTransition}>
              <ModeSelect
                onBack={() => setView("robot_selection")}
                onSelectMode={(modo: string) => {
                  setControlMode(modo);
                  setView("controles");
                }}
              />
            </motion.section>
          )}

          {view === "controles" && user && livekitToken && (
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
                  controlMappings={user?.control_mappings}
                  mode={controlMode}
                  onUpdateMappings={async (newMappings: any) => {
                    try {
                      const res = await apiFetch('/api/profile/mappings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ control_mappings: newMappings })
                      });
                      if (res.ok) {
                        setUser({ ...user, control_mappings: newMappings });
                        notificar(t('alertas.controlesGuardados'), 'exito');
                      } else {
                        notificar(t('alertas.errorGuardarControles'), 'error');
                      }
                    } catch (e) {
                      notificar(t('perfil.errorConexion'), 'error');
                    }
                  }}
                />
              </Suspense>
            </motion.section>
          )}

          {view === "admin_content" && (
            <motion.section key="admin_content" className="full-container" {...pageTransition} style={{ width: '98%', maxWidth: '1920px', margin: '40px auto', display: 'flex', flexDirection: 'column' }}>
              
              <AdminContent onBack={() => setView("dashboard")} user={user} />
            </motion.section>
          )}
          {view === "admin_users" && (
            <motion.section key="admin_users" className="full-container" {...pageTransition} style={{ maxWidth: '1400px', margin: '40px auto', display: 'flex', flexDirection: 'column' }}>
              <AdminUsers user={user} setView={setView} />
            </motion.section>
          )}

          {view === "admin_logs" && (
            <motion.section key="admin_logs" className="full-container" {...pageTransition} style={{ maxWidth: '1400px', margin: '40px auto', display: 'flex', flexDirection: 'column' }}>
              <AdminLogs crowdsecMetrics={crowdsecMetrics} logsList={logsList} setView={setView} />
            </motion.section>
          )}
          {view === "admin_config" && (
            <motion.section key="admin_config" className="full-container" style={{ maxWidth: '1440px', margin: '40px auto', padding: '0 40px', width: '100%', display: 'flex', flexDirection: 'column' }} {...pageTransition}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', textAlign: 'left', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--accent)' }}>{t('adminRobots.tituloTabla')}</h3>
                    </div>
                    <button onClick={() => setEditingRobot({ isNew: true, id: `rassor-${Date.now().toString().slice(-4)}`, name: '', room: '', status: 'online', locomotionType: 'tank', modelUrl: '', livekitUrl: '', isPublicEvent: false })} style={{ width: 'auto' }}>{t('adminRobots.registrarNueva')}</button>
                </div>

                <div style={{ overflowX: 'auto', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colEstado')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colUnidad')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colId')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colRoom')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colLocomocion')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colTransmision')}</th>
                                <th style={{ padding: '16px' }}>{t('adminRobots.colModelo')}</th>
                                <th style={{ padding: '16px', textAlign: 'right' }}>{t('adminRobots.colAcciones')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {robots.map(r => {
                                const tipoLocomocion = r.locomotionType || (String(r.id || '').toLowerCase().includes('rassor') || String(r.name || '').toLowerCase().includes('rassor') ? 'tank' : 'joystick');
                                return (
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
                                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', letterSpacing: '0.05em', border: `1px solid ${tipoLocomocion === 'tank' ? 'var(--accent)' : 'var(--border)'}`, color: tipoLocomocion === 'tank' ? 'var(--accent)' : 'var(--muted)', background: tipoLocomocion === 'tank' ? 'rgba(251,202,1,0.08)' : 'transparent' }}>
                                            {tipoLocomocion === 'tank' ? t('adminRobots.locomocionTanqueCorto') : t('adminRobots.locomocionJoystickCorto')}
                                        </span>
                                    </td>
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
                                        <button onClick={() => handleDeleteRobot(r.id)} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--muted)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>{t('adminRobots.eliminar')}</button>
                                    </td>
                                </tr>
                                );
                            })}
                            {robots.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: errorRobots ? 'var(--error)' : 'var(--muted)' }}>
                                        {errorRobots ? `${t('adminRobots.errorCargarUnidadesPrefijo')} ${errorRobots}` : t('adminRobots.sinUnidades')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* MODAL DE EDICIÓN (Diseño redondeado, scroll interno y sin requerir zoom) */}
                {editingRobot && (
                    <div
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(3, 8, 22, 0.8)",
                            backdropFilter: "blur(8px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 9999,
                            padding: "20px",
                        }}
                        onClick={() => setEditingRobot(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 15 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                width: "100%",
                                maxWidth: "720px",
                                maxHeight: "90vh",
                                display: "flex",
                                flexDirection: "column",
                                boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
                                overflow: "hidden",
                                boxSizing: "border-box",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 28px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontFamily: "var(--font-titulo)", fontSize: "1.25rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 400 }}>
                                        {editingRobot.isNew ? t("adminRobots.registrarNuevaUnidad") : t("adminRobots.editarUnidad")}
                                    </h3>
                                    <p style={{ margin: "6px 0 0 0", fontFamily: "var(--font-ibm-mono)", fontSize: "0.8rem", color: "var(--muted)" }}>
                                        {editingRobot.isNew ? "Registra y vincula una nueva unidad robótica al sistema" : `Parámetros técnicos y enlace para ${editingRobot.name || editingRobot.id}`}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditingRobot(null)}
                                    style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.2s ease" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                                    title={t("adminRobots.cancelar")}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveRobot} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, margin: 0 }}>
                                <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: "24px" }}>
                                    
                                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                        <h4 style={{ margin: 0, color: "var(--accent)", fontFamily: "var(--font-ibm-mono)", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                                            1. Identificación y Control
                                        </h4>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                                            <div className="input-group">
                                                <label>{t("adminRobots.idInterno")}</label>
                                                <input name="id" defaultValue={editingRobot.id} readOnly={!editingRobot.isNew} required style={{ background: !editingRobot.isNew ? "rgba(255,255,255,0.03)" : "var(--background)" }} />
                                            </div>
                                            <div className="input-group">
                                                <label>{t("adminRobots.nombrePublico")}</label>
                                                <input name="name" defaultValue={editingRobot.name} required />
                                            </div>
                                            <div className="input-group">
                                                <label>{t("adminRobots.estadoSimulacion")}</label>
                                                <select name="status" defaultValue={editingRobot.status}>
                                                    <option value="online">{t("adminRobots.onlineVerde")}</option>
                                                    <option value="offline">{t("adminRobots.offlineRojo")}</option>
                                                </select>
                                            </div>
                                            <div className="input-group">
                                                <label>{t("adminRobots.sistemaLocomocion")}</label>
                                                <select
                                                    name="locomotionType"
                                                    defaultValue={editingRobot.locomotionType || (String(editingRobot.id || "").toLowerCase().includes("rassor") || String(editingRobot.name || "").toLowerCase().includes("rassor") ? "tank" : "joystick")}
                                                >
                                                    <option value="tank">{t("adminRobots.locomocionTanque")}</option>
                                                    <option value="joystick">{t("adminRobots.locomocionJoystick")}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                                        <h4 style={{ margin: 0, color: "var(--accent)", fontFamily: "var(--font-ibm-mono)", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                                            2. Parámetros de Enlace LiveKit
                                        </h4>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                                            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                                                <label>{t("adminRobots.livekitRoom")}</label>
                                                <input name="room" defaultValue={editingRobot.room} required style={{ border: "1px solid var(--accent)" }} />
                                            </div>
                                            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                                                <label>{t("adminRobots.urlLivekit")}</label>
                                                <input name="livekitUrl" defaultValue={editingRobot.livekitUrl} placeholder="wss://rur-livekit-server-8b010r3b.livekit.cloud" />
                                            </div>
                                            <div className="input-group">
                                                <label>{t("adminRobots.livekitApiKey")}</label>
                                                <input type="password" name="livekitApiKey" defaultValue={editingRobot.livekitApiKey} placeholder={t("adminRobots.apiSecretPlaceholder")} />
                                            </div>
                                            <div className="input-group">
                                                <label>{t("adminRobots.livekitApiSecret")}</label>
                                                <input type="password" name="livekitApiSecret" placeholder={editingRobot.livekitApiSecretMasked ? `${t("adminRobots.apiSecretGuardado")} (${editingRobot.livekitApiSecretMasked}) ${t("adminRobots.apiSecretReemplazar")}` : t("adminRobots.apiSecretPlaceholder")} />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                                        <h4 style={{ margin: 0, color: "var(--accent)", fontFamily: "var(--font-ibm-mono)", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                                            3. Modelo 3D y Transmisión
                                        </h4>
                                        <div className="input-group">
                                            <label>{t("adminRobots.rutaModelo")}</label>
                                            {modelos3d.length > 0 && (
                                              <select
                                                defaultValue=""
                                                onChange={(e) => {
                                                  if (e.target.value && robotModelInputRef.current) {
                                                    robotModelInputRef.current.value = e.target.value;
                                                  }
                                                  e.target.value = "";
                                                }}
                                                style={{ marginBottom: "8px" }}
                                              >
                                                <option value="">{t("adminRobots.elegirModeloExistente")}</option>
                                                {modelos3d.map((m) => (
                                                  <option key={m.url} value={m.url}>
                                                    {m.etiqueta} — {m.origen === "robot" ? t("modelos3d.origenRobot") : t("modelos3d.origenPublicacion")}
                                                  </option>
                                                ))}
                                              </select>
                                            )}
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <input ref={robotModelInputRef} name="modelUrl" defaultValue={editingRobot.modelUrl} placeholder="/models/mi-robot.glb" style={{ flex: 1 }} />
                                                <input type="file" accept=".glb,.gltf" onChange={handleRobotModelUpload} style={{ display: "none" }} id="upload-robot-model" />
                                                <label htmlFor="upload-robot-model" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "12px 16px", background: "var(--surface-strong)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "4px", textAlign: "center", cursor: "pointer", fontFamily: "var(--font-ibm-mono)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                                                    {comprimiendoRobotModel ? t("adminRobots.comprimiendo") : uploadingRobotModel ? t("adminRobots.subiendo") : <><Upload size={14} /> {t("adminRobots.subir")}</>}
                                                </label>
                                            </div>
                                            {(comprimiendoRobotModel || uploadingRobotModel) && (
                                              <div style={{ marginTop: "10px" }}>
                                                <div style={{ height: "4px", background: "var(--background)", border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                                                  <div style={{
                                                    height: "100%",
                                                    width: `${Math.round(progresoModelo * 100)}%`,
                                                    background: "var(--accent)",
                                                    transition: "width 0.15s linear",
                                                  }} />
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontFamily: "var(--font-ibm-mono)", fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)" }}>
                                                  <span>{comprimiendoRobotModel ? t("adminRobots.comprimiendo") : t("adminRobots.subiendo")}</span>
                                                  <span>{Math.round(progresoModelo * 100)}%</span>
                                                </div>
                                              </div>
                                            )}
                                        </div>

                                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px", background: "var(--background)", border: "1px solid var(--border)", borderRadius: "4px", cursor: "pointer", fontFamily: "var(--font-ibm-mono)", fontSize: "0.85rem", color: "var(--muted)" }}>
                                            <input type="checkbox" id="check-public-event" name="isPublicEvent" defaultChecked={Boolean(editingRobot.isPublicEvent)} style={{ width: "auto", marginTop: "3px", cursor: "pointer" }} />
                                            <label htmlFor="check-public-event" style={{ display: "flex", flexDirection: "column", gap: "4px", cursor: "pointer" }}>
                                                <span style={{ color: "var(--text)", letterSpacing: "0.05em", fontWeight: 600 }}>{t("adminRobots.transmisionPublica")}</span>
                                                <span style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
                                                    {t("adminRobots.transmisionDescripcion")} <span style={{ color: "var(--accent)" }}>/espectador/{editingRobot.id}</span>{t("adminRobots.transmisionDescripcion2")}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", padding: "16px 28px", borderTop: "1px solid var(--border)", background: "var(--background)", flexShrink: 0 }}>
                                    <button type="button" className="logout-btn" onClick={() => setEditingRobot(null)} style={{ padding: "10px 20px", height: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {t("adminRobots.cancelar")}
                                    </button>
                                    <button type="submit" style={{ width: "auto", padding: "10px 24px", background: "var(--accent)", color: "#000", fontWeight: "bold" }}>
                                        {editingRobot.isNew ? t("adminRobots.registrar") : t("adminRobots.guardarCambios")}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                <div style={{ marginTop: '24px', paddingTop: '16px', display: 'flex', justifyContent: 'flex-start' }}>
                  <button className="back-link" onClick={() => setView("dashboard")} style={{ margin: 0 }}>
                    {t('adminRobots.volverMenu')}
                  </button>
                </div>
              </div>
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
              <div className="panel-header" style={{ marginBottom: '16px' }}>
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

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-start' }}>
                <button className="back-link" onClick={() => setView(user ? "dashboard" : "login")} style={{ margin: 0 }}>
                  {t('ajustes.volverInicio')}
                </button>
              </div>
            </motion.section>
          )}

          {view === "accessibility" && (
            <motion.section key="accessibility" className="dashboard-card" {...pageTransition}>
              <div className="panel-header" style={{ marginBottom: '16px' }}>
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

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-start' }}>
                <button className="back-link" onClick={() => setView("settings_menu")} style={{ margin: 0 }}>
                  {t('accesibilidad.atras')}
                </button>
              </div>
            </motion.section>
          )}

        </AnimatePresence>
      </main>
    </div>
    </MotionConfig>
  );
}